import paramiko

key = paramiko.RSAKey.from_private_key_file('slt-nexus-key-auto.pem')
ssh_client = paramiko.SSHClient()
ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    ssh_client.connect(hostname='16.171.166.199', username='ubuntu', pkey=key)
    
    nginx_conf = """server {
    listen 80;
    server_name 16.171.166.199.nip.io;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Increase timeouts for long-running AI tasks
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }
}"""
    
    # Write nginx config locally then sftp it
    with open('nexus.conf', 'w') as f:
        f.write(nginx_conf)
        
    sftp = ssh_client.open_sftp()
    sftp.put('nexus.conf', '/home/ubuntu/nexus.conf')
    sftp.close()
    
    commands = [
        'sudo apt-get update -y',
        'sudo apt-get install -y nginx certbot python3-certbot-nginx',
        'sudo mv /home/ubuntu/nexus.conf /etc/nginx/sites-available/nexus',
        'sudo ln -sf /etc/nginx/sites-available/nexus /etc/nginx/sites-enabled/',
        'sudo rm -f /etc/nginx/sites-enabled/default',
        'sudo systemctl restart nginx',
        'sudo certbot --nginx -d 16.171.166.199.nip.io --non-interactive --agree-tos -m dev@slt.lk --redirect'
    ]
    
    for cmd in commands:
        print(f'Running: {cmd}')
        stdin, stdout, stderr = ssh_client.exec_command(cmd, timeout=300)
        out = stdout.read().decode('utf-8', errors='replace')
        err = stderr.read().decode('utf-8', errors='replace')
        print('OUT:', out.encode('ascii', 'ignore').decode())
        if err: print('ERR:', err.encode('ascii', 'ignore').decode())
        
    print('SSL setup complete!')
    
except Exception as e:
    print(f'Error: {e}')
finally:
    ssh_client.close()

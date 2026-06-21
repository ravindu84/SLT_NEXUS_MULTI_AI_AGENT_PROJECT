import sqlite3, os

db_path=os.path.join(os.path.expanduser('~'), 'SLT_NEXUS_MULTI_AI_AGENT_PROJECT/backend/slt_dummy.db')

db=sqlite3.connect(db_path)

db.execute('DELETE FROM fault_tickets')

db.commit()

db.close()

print('Done')

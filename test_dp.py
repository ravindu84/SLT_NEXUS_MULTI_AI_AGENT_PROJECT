from backend.agent.tools.provisioner_tools import allocate_fiber_dp_loop

print("Testing DP allocation 10 times to ensure DP shifting works...")

for i in range(10):
    res = allocate_fiber_dp_loop.invoke({"gps_location": "6.8373, 79.9926"})
    print(f"Iteration {i+1}:", res)

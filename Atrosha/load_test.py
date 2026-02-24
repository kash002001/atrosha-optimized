import aiohttp
import asyncio
import time
import uuid

url = "http://localhost:8080/proxy/v1/charges"
headers = {
    "X-Atrosha-Agent-ID": "agt_1234",
    "X-Atrosha-Target": "https://api.stripe.com",
    "Content-Type": "application/json"
}
payload = '{"amount": 25, "currency": "usd", "description": "Standard SaaS tier."}'

async def fetch(session):
    start = time.perf_counter()
    req_headers = headers.copy()
    req_headers["X-Atrosha-Agent-ID"] = f"agt_load_{uuid.uuid4().hex[:8]}"
    try:
        async with session.post(url, headers=req_headers, data=payload) as response:
            await response.text()
            status = response.status
    except Exception as e:
        status = 500
    
    return time.perf_counter() - start, status

async def worker(session, requests_to_make, results):
    for _ in range(requests_to_make):
        results.append(await fetch(session))

async def main(concurrency=50, total_requests=1000):
    requests_per_worker = total_requests // concurrency
    
    conn = aiohttp.TCPConnector(limit=concurrency)
    async with aiohttp.ClientSession(connector=conn) as session:
        results = []
        tasks = []
        
        start = time.perf_counter()
        for _ in range(concurrency):
            tasks.append(worker(session, requests_per_worker, results))
            
        await asyncio.gather(*tasks)
        total_time = time.perf_counter() - start
        
        latencies = [r[0] for r in results if r[1] in [200, 201, 400, 401, 403, 404, 502, 503]]
        errors = [r[0] for r in results if r[1] not in [200, 201, 400, 401, 403, 404, 502, 503]]
        
        latencies.sort()
        if latencies:
            p50 = latencies[int(len(latencies)*0.50)]
            p90 = latencies[int(len(latencies)*0.90)]
            p95 = latencies[int(len(latencies)*0.95)]
            p99 = latencies[int(len(latencies)*0.99)]
        else:
            p50 = p90 = p95 = p99 = 0
        
        print(f"=== Load Test Results ===")
        print(f"Total Requests: {len(results)}")
        print(f"Successful/Expected: {len(latencies)}")
        print(f"Errors: {len(errors)}")
        print(f"Concurrency: {concurrency}")
        print(f"Total Time: {total_time:.2f}s")
        print(f"Requests/sec (RPS): {len(results)/total_time:.2f}")
        print(f"--- Latency ---")
        if latencies:
            print(f"Avg: {(sum(latencies)/len(latencies))*1000:.2f}ms")
            print(f"P50: {p50*1000:.2f}ms")
            print(f"P90: {p90*1000:.2f}ms")
            print(f"P95: {p95*1000:.2f}ms")
            print(f"P99: {p99*1000:.2f}ms")

if __name__ == "__main__":
    import sys
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main(concurrency=100, total_requests=2000))

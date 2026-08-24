const URL = "https://api.ustaadpro.pk/api/shop/products";
const REQUESTS = 100;

async function test() {
    console.time("Total time");

    const start = Date.now();

    const requests = Array.from({ length: REQUESTS }, async (_, i) => {
        const requestStart = Date.now();

        try {
            const response = await fetch(URL);
            await response.text();

            return {
                id: i + 1,
                status: response.status,
                time: Date.now() - requestStart,
            };
        } catch (error) {
            return {
                id: i + 1,
                status: "ERROR",
                time: Date.now() - requestStart,
            };
        }
    });

    const results = await Promise.all(requests);

    const totalTime = Date.now() - start;

    const successful = results.filter(
        (r) => r.status >= 200 && r.status < 300
    ).length;

    const failed = REQUESTS - successful;

    const times = results.map((r) => r.time);

    console.log("\n========== LOAD TEST ==========");
    console.log(`Concurrent Requests : ${REQUESTS}`);
    console.log(`Successful          : ${successful}`);
    console.log(`Failed              : ${failed}`);
    console.log(`Fastest Response    : ${Math.min(...times)} ms`);
    console.log(`Slowest Response    : ${Math.max(...times)} ms`);
    console.log(
        `Average Response    : ${Math.round(
            times.reduce((a, b) => a + b, 0) / times.length
        )} ms`
    );
    console.log(`Total Test Time     : ${totalTime} ms`);
    console.log(
        `Approx Requests/sec : ${Math.round(
            REQUESTS / (totalTime / 1000)
        )}`
    );
    console.log("===============================\n");

    console.timeEnd("Total time");
}

test();
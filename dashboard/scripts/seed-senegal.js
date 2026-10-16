const https = require('https');
const http = require('http');

// Helper for making requests
const fetchJson = (url) => new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    reject(e);
                }
            } else {
                reject(new Error(`Failed with status: ${res.statusCode}`));
            }
        });
    }).on('error', reject);
});

const postJson = (url, data) => new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const lib = urlObj.protocol === 'https:' ? https : http;
    const req = lib.request(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve(body));
    });
    req.on('error', reject);
    req.write(JSON.stringify(data));
    req.end();
});

const delay = ms => new Promise(r => setTimeout(r, ms));

async function seed() {
    try {
        console.log("Checking if data already exists...");
        const existingRegions = await fetchJson('http://localhost:5000/api/divisions/regions');
        if (existingRegions.data.regions && existingRegions.data.regions.length > 0) {
            console.log("Database already contains regions. Skipping seed.");
            return;
        }

        console.log("Fetching Senegal data from public API...");
        const API_URL = "https://decoupage-administratif-api.onrender.com/api/v1";
        
        const regionsData = await fetchJson(`${API_URL}/regions`);
        const deptsData = await fetchJson(`${API_URL}/departements`);
        const communesData = await fetchJson(`${API_URL}/communes`);

        console.log(`Fetched ${regionsData.length} regions, ${deptsData.length} departments, ${communesData.length} communes.`);

        // 1. Insert Regions
        console.log("Inserting Regions...");
        for (const reg of regionsData) {
            await postJson('http://localhost:5000/api/divisions/regions', {
                nom: reg.nom_region,
                code: (reg.nom_region.substring(0, 3) + reg.id).toUpperCase()
            });
        }
        await delay(500);
        
        // Fetch created regions to map IDs
        const ourRegionsRes = await fetchJson('http://localhost:5000/api/divisions/regions');
        const ourRegions = ourRegionsRes.data.regions;
        
        const mapRegionToOurId = (publicNom) => {
            const match = ourRegions.find(r => r.nom.toLowerCase() === publicNom.toLowerCase());
            return match ? match.id : null;
        };

        // 2. Insert Departments
        console.log("Inserting Departments...");
        for (const dept of deptsData) {
            const ourRegionId = mapRegionToOurId(dept.region.nom_region);
            if (!ourRegionId) continue;
            
            await postJson('http://localhost:5000/api/divisions/departements', {
                nom: dept.nom_departement,
                code: (dept.nom_departement.substring(0, 3) + dept.id).toUpperCase(),
                region_id: ourRegionId
            });
            await delay(50); // prevent overwhelming local server
        }
        await delay(500);

        // Fetch created depts
        const ourDeptsRes = await fetchJson('http://localhost:5000/api/divisions/departements');
        const ourDepts = ourDeptsRes.data.departements;
        
        const mapDeptToOurId = (publicNom) => {
            const match = ourDepts.find(d => d.nom.toLowerCase() === publicNom.toLowerCase());
            return match ? match.id : null;
        };

        // 3. Insert Communes
        console.log("Inserting Communes...");
        let count = 0;
        for (const com of communesData) {
            // Some APIs nest the department name inside departement object
            const deptName = com.departement ? com.departement.nom_departement : null;
            if (!deptName) continue;

            const ourDeptId = mapDeptToOurId(deptName);
            if (!ourDeptId) continue;

            await postJson('http://localhost:5000/api/divisions/communes', {
                nom: com.nom_commune,
                code: "COM" + com.id,
                departement_id: ourDeptId
            });
            
            count++;
            if (count % 50 === 0) console.log(`... inserted ${count} communes`);
            await delay(10);
        }

        console.log("Done seeding Senegal geographic data!");
    } catch (e) {
        console.error("Error during seeding:", e.message);
    }
}

seed();

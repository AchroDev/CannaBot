module.exports = {
    // Unique ID for each item
    og_kush: {
        id: "og_kush",
        type: "seed",
        name: "OG Kush Seed",
        description: "A classic, earthy seed.",
        price: 20,
        sellPrice: 10,
        // Seed-specific properties
        growsInto: "OG Kush Bud",
        growTime: 60 * 1000, // 60 seconds for testing
        reward: 50,
        xp: 10
    },
    blue_dream: {
        id: "blue_dream",
        type: "seed",
        name: "Blue Dream Seed",
        description: "A sweet, berry-like seed.",
        price: 50,
        sellPrice: 25,
        growsInto: "Blue Dream Bud",
        growTime: 120 * 1000, // 2 minutes
        reward: 110,
        xp: 25
    },
    // --- ADD THE SEASONAL ITEM HERE ---
    freedom_bloom: {
        id: "freedom_bloom",
        type: "seed",
        name: "Freedom Bloom Seed",
        description: "A festive, sparkling seed. Available for a limited time!",
        price: 40, // On sale for the 4th!
        sellPrice: 20,
        growsInto: "Freedom Bloom Bud",
        growTime: 30 * 1000, // Make it a quick one for the holiday!
        reward: 75,
        xp: 76 // "Spirit of '76"
    },
    // Add more stuff here...
};
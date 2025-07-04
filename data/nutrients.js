module.exports = {
    basic_fertilizer: {
        id: "basic_fertilizer",
        type: "nutrient",
        name: "Basic Fertilizer",
        description: "Reduces grow time by 10%.",
        price: 100,
        sellPrice: 50,
        // Nutrient-specific properties
        effect: {
            type: "time_reduction_percent",
            value: 0.10
        }
    }
};
export const Weights = {
  study: {
    typeLibrary: 40,
    typeCafe: 20,
    keywords: 10, // لكل إصابة، حتى 3
    antiPenalty: 25,
    servesCoffee: 8,
    opensEarly: 6,
  },
  romantic: {
    keywords: 10, // لكل إصابة، حتى 3
    priceModerate: 10, // priceLevel>=3
    priceHigh: 15, // priceLevel>=4
    opensLate: 8,
    liveMusic: 8,
    outdoorSeating: 6,
    typeRomanticish: 6, // fine dining, wine bar, observation_deck, park, garden
  },
  classic: {
    typeHeritage: 35, // historical, museum...
    keywords: 10, // لكل إصابة، حتى 3
    typeLocal: 8, // turkish_restaurant, tea_house
    penaltyNightClub: 10,
  },
  levels: { likely: 70, maybe: 50 }, // العتبات
};

// src/constants/locations.js

export const CITIES = ["Lahore", "Multan", "Rawalpindi", "Sargodha"];

export const BRANCHES_BY_CITY = {
  Lahore: [
    "Arfa Karim Tower",
    "Allama Iqbal Town Branch",
    "Johar Town Branch",
    "Shahdara Branch",
  ],
  Multan: ["Multan Branch"],
  Rawalpindi: ["Rawalpindi Branch"],
  Sargodha: ["Sargodha Branch"], // no branches yet
};

export function getBranchesForCity(city) {
  return BRANCHES_BY_CITY[city] || [];
}

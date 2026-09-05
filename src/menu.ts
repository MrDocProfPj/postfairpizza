export const PEOPLE = ["Madeline", "Kenny", "JZ", "Jay", "Crit", "Morgan", "Almond"];

export const CRUSTS = [
  { name: "Hand Tossed", extra: false },
  { name: "Handmade Pan", extra: true },
  { name: "Crunchy Thin", extra: false },
];

export const SAUCES = [
  "Robust Tomato",
  "Hearty Marinara",
  "Garlic Parmesan",
  "Alfredo",
  "BBQ",
  "Ranch",
];

export const CHEESE = ["Normal", "Light", "None"];

export const TOPPINGS: { group: string; items: { name: string; extra?: boolean }[] }[] = [
  {
    group: "Meats",
    items: [
      { name: "Pepperoni" },
      { name: "Italian Sausage" },
      { name: "Beef" },
      { name: "Ham" },
      { name: "Bacon" },
      { name: "Philly Steak", extra: true },
      { name: "Premium Chicken", extra: true },
      { name: "Salami" },
      { name: "Anchovies" },
    ],
  },
  {
    group: "Veggies",
    items: [
      { name: "Onions" },
      { name: "Green Peppers" },
      { name: "Mushrooms" },
      { name: "Black Olives" },
      { name: "Jalapeños" },
      { name: "Banana Peppers" },
      { name: "Roasted Red Peppers" },
      { name: "Spinach" },
      { name: "Pineapple" },
      { name: "Diced Tomatoes" },
    ],
  },
  {
    group: "Cheeses",
    items: [
      { name: "Extra Cheese" },
      { name: "Feta" },
      { name: "Shredded Provolone" },
      { name: "Parmesan Asiago" },
      { name: "Cheddar" },
    ],
  },
];

export const SAUCE_CUPS = ["Garlic", "Ranch", "Marinara", "Blue Cheese", "Hot Buffalo", "Icing"];

export const EXTRAS: { group: string; items: string[] }[] = [
  {
    group: "Sides",
    items: [
      "Parmesan Bread Bites",
      "Stuffed Cheesy Bread",
      "Bread Twists",
      "Boneless Wings",
      "Cinnamon Twists",
      "Chocolate Lava Cakes",
    ],
  },
  {
    group: "Drinks",
    items: ["2L Coke", "2L Diet Coke", "2L Sprite", "2L Dr Pepper", "20oz Water"],
  },
];

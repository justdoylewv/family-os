// Shared by the app and the Siri endpoint (api/add-groceries.ts).

// Phrases that contain "and" but are one item.
const ONE_ITEM = [
  'mac and cheese',
  'macaroni and cheese',
  'salt and pepper',
  'peanut butter and jelly',
  'pb and j',
  'half and half',
  'sour cream and onion',
  'chips and salsa',
];

/** "We need milk, eggs and bananas" -> ["Milk", "Eggs", "Bananas"] */
export function splitItems(text: string): string[] {
  let t = String(text || '').replace(/[.!?]+\s*$/, '').trim();
  t = t.replace(/^(please\s+)?(add|put|get|buy|grab|pick up|we need|we're out of|we are out of|we're low on|need|out of)\s+/i, '');
  t = t.replace(/\s+(to|on)\s+(the\s+|our\s+)?(grocery\s+|shopping\s+)?list$/i, '');
  ONE_ITEM.forEach((ph, i) => {
    t = t.replace(new RegExp(ph, 'ig'), `\u0001${i}\u0001`);
  });
  return t
    .split(/\s*(?:,|;|\n|&|\band\b|\bplus\b)\s*/i)
    .map((x) => x.replace(/\u0001(\d+)\u0001/g, (_m, i: string) => ONE_ITEM[Number(i)]).replace(/^(some|a|an|more)\s+/i, '').trim())
    .filter(Boolean)
    .map((x) => (x.charAt(0).toUpperCase() + x.slice(1)).slice(0, 80))
    .slice(0, 30);
}

// First match wins, so specific phrases come before the words inside them.
const AISLE_RULES: [RegExp, string][] = [
  [/peanut butter|mac(aroni)? and cheese|cream of|cream cheese frost/i, 'Pantry'],
  [/frozen|ice cream|popsicle|waffle|tater tot|nugget|pizza rolls/i, 'Frozen'],
  [/paper towel|toilet|tissue|soap|detergent|trash bag|garbage bag|sponge|shampoo|conditioner|toothpaste|toothbrush|deodorant|diaper|wipes|foil|plastic wrap|zip|batter(y|ies)|light ?bulb|cleaner|bleach|dryer sheet|napkin|band-?aid|lotion|razor|floss/i, 'Household'],
  [/chicken|beef|pork|turkey|bacon|sausage|\bham\b|steak|ground|salmon|shrimp|fish|hot dog|deli|pepperoni|lunch meat/i, 'Meat'],
  [/milk|cheese|yogh?urt|butter|cream|\beggs?\b|half and half|cottage/i, 'Dairy'],
  [/apple|banana|berr|grape|orange|lemon|lime|melon|peach|pear|plum|cherr|mango|pineapple|kiwi|avocado|tomato|lettuce|spinach|kale|salad|carrot|celery|cucumber|broccoli|cauliflower|onion|garlic|potato|pepper(?!oni)|zucchini|squash|mushroom|herb|cilantro|parsley|basil|ginger|fruit|veggie|vegetable|green bean/i, 'Produce'],
  [/bread|bagel|tortilla|bun|cereal|oat|granola|pasta|spaghetti|noodle|rice|flour|sugar|coffee|\btea\b|beans|sauce|salsa|ketchup|mustard|mayo|oil|vinegar|spice|salt|honey|syrup|jam|jelly|chips|cracker|pretzel|cookie|snack|soup|broth|juice|soda|water|nuts|almond|raisin|pancake|popcorn|tuna|baking/i, 'Pantry'],
];

export function aisleFor(text: string): string {
  const hit = AISLE_RULES.find(([re]) => re.test(text));
  return hit ? hit[1] : 'Other';
}

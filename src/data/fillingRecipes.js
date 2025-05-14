export const fillingRecipes = [
  {
    id: 'red-bean-paste',
    name: '红豆沙',
    description: '传统红豆沙馅料',
    ingredients: [
      { ingredientId: 'red-beans', quantity: 500, unit: '克' },
      { ingredientId: 'sugar', quantity: 300, unit: '克' },
      { ingredientId: 'oil', quantity: 100, unit: '克' },
      { ingredientId: 'water', quantity: 1000, unit: '毫升' }
    ],
    yield: 850,
    unit: '克',
    subFillings: []
  },
  {
    id: 'sweet-cream',
    name: '甜奶油',
    description: '香甜的奶油馅料',
    ingredients: [
      { ingredientId: 'heavy-cream', quantity: 500, unit: '毫升' },
      { ingredientId: 'sugar', quantity: 100, unit: '克' },
      { ingredientId: 'vanilla-extract', quantity: 10, unit: '毫升' }
    ],
    yield: 580,
    unit: '克',
    subFillings: []
  },
  {
    id: 'chocolate-filling',
    name: '巧克力馅',
    description: '浓郁巧克力馅料',
    ingredients: [
      { ingredientId: 'chocolate', quantity: 300, unit: '克' },
      { ingredientId: 'butter', quantity: 100, unit: '克' },
      { ingredientId: 'milk', quantity: 100, unit: '毫升' },
      { ingredientId: 'sugar', quantity: 50, unit: '克' }
    ],
    yield: 450,
    unit: '克',
    subFillings: []
  },
  {
    id: 'custard',
    name: '卡仕达酱',
    description: '经典法式卡仕达酱',
    ingredients: [
      { ingredientId: 'milk', quantity: 500, unit: '毫升' },
      { ingredientId: 'egg-yolk', quantity: 100, unit: '克' },
      { ingredientId: 'sugar', quantity: 120, unit: '克' },
      { ingredientId: 'cornstarch', quantity: 30, unit: '克' },
      { ingredientId: 'vanilla-extract', quantity: 5, unit: '毫升' }
    ],
    yield: 600,
    unit: '克',
    subFillings: []
  },
  {
    id: 'almond-cream',
    name: '杏仁奶油',
    description: '带有杏仁风味的奶油馅',
    ingredients: [
      { ingredientId: 'butter', quantity: 200, unit: '克' },
      { ingredientId: 'sugar', quantity: 200, unit: '克' },
      { ingredientId: 'egg', quantity: 200, unit: '克' },
      { ingredientId: 'almond-powder', quantity: 200, unit: '克' },
      { ingredientId: 'flour', quantity: 50, unit: '克' }
    ],
    yield: 620,
    unit: '克',
    subFillings: []
  },
  {
    id: 'matcha-custard',
    name: '抹茶卡仕达',
    description: '带有抹茶风味的卡仕达酱',
    ingredients: [
      { ingredientId: 'milk', quantity: 400, unit: '毫升' },
      { ingredientId: 'egg-yolk', quantity: 80, unit: '克' },
      { ingredientId: 'sugar', quantity: 100, unit: '克' },
      { ingredientId: 'cornstarch', quantity: 25, unit: '克' },
      { ingredientId: 'matcha-powder', quantity: 20, unit: '克' }
    ],
    yield: 500,
    unit: '克',
    subFillings: []
  },
  {
    id: 'fruit-compote',
    name: '水果酱',
    description: '混合水果酱',
    ingredients: [
      { ingredientId: 'mixed-fruits', quantity: 500, unit: '克' },
      { ingredientId: 'sugar', quantity: 200, unit: '克' },
      { ingredientId: 'lemon-juice', quantity: 30, unit: '毫升' },
      { ingredientId: 'water', quantity: 50, unit: '毫升' }
    ],
    yield: 600,
    unit: '克',
    subFillings: []
  },
  {
    id: 'hazelnut-chocolate',
    name: '榛子巧克力',
    description: '带有榛子风味的巧克力馅',
    ingredients: [
      { ingredientId: 'chocolate', quantity: 250, unit: '克' },
      { ingredientId: 'hazelnut', quantity: 100, unit: '克' },
      { ingredientId: 'butter', quantity: 50, unit: '克' },
      { ingredientId: 'sugar', quantity: 50, unit: '克' }
    ],
    yield: 400,
    unit: '克',
    subFillings: []
  },
  {
    id: 'apple-cinnamon',
    name: '苹果肉桂馅',
    description: '苹果与肉桂的经典组合',
    ingredients: [
      { ingredientId: 'apple', quantity: 600, unit: '克' },
      { ingredientId: 'sugar', quantity: 150, unit: '克' },
      { ingredientId: 'cinnamon', quantity: 5, unit: '克' },
      { ingredientId: 'lemon-juice', quantity: 20, unit: '毫升' },
      { ingredientId: 'butter', quantity: 30, unit: '克' },
      { ingredientId: 'flour', quantity: 20, unit: '克' }
    ],
    yield: 650,
    unit: '克',
    subFillings: []
  },
  {
    id: 'cream-cheese',
    name: '奶油奶酪馅',
    description: '浓郁的奶油奶酪馅',
    ingredients: [
      { ingredientId: 'cream-cheese', quantity: 500, unit: '克' },
      { ingredientId: 'sugar', quantity: 150, unit: '克' },
      { ingredientId: 'egg', quantity: 100, unit: '克' },
      { ingredientId: 'vanilla-extract', quantity: 5, unit: '毫升' }
    ],
    yield: 620,
    unit: '克',
    subFillings: [
      {
        subFillingId: 'fruit-topping',
        name: '水果浇头',
        quantity: 150,
        unit: '克',
        recipeId: 'fruit-compote'
      }
    ]
  },
  {
    id: 'triple-chocolate',
    name: '三重巧克力',
    description: '黑巧克力、牛奶巧克力与白巧克力的组合',
    ingredients: [
      { ingredientId: 'dark-chocolate', quantity: 100, unit: '克' },
      { ingredientId: 'milk-chocolate', quantity: 100, unit: '克' },
      { ingredientId: 'white-chocolate', quantity: 100, unit: '克' },
      { ingredientId: 'heavy-cream', quantity: 150, unit: '毫升' },
      { ingredientId: 'butter', quantity: 50, unit: '克' }
    ],
    yield: 400,
    unit: '克',
    subFillings: [
      {
        subFillingId: 'hazelnut-crunch',
        name: '榛子脆片',
        quantity: 50,
        unit: '克',
        recipeId: 'red-bean-paste'
      }
    ]
  },
  {
    id: 'hazelnut-crunch',
    name: '榛子脆片',
    description: '碾碎的榛子与焦糖混合',
    ingredients: [
      { ingredientId: 'hazelnut', quantity: 100, unit: '克' },
      { ingredientId: 'sugar', quantity: 50, unit: '克' },
      { ingredientId: 'water', quantity: 20, unit: '毫升' }
    ],
    yield: 120,
    unit: '克',
    subFillings: []
  }
];
  
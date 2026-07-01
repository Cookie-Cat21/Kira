/** AUTO-GENERATED — node scripts/generate-reorder-habit.mjs */
export const GROUP_X = [
  {
    "id": "X001",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "order again"
        }
      ],
      "cart": [],
      "lastOrder": {
        "orderRef": "KP-GEN-X001",
        "placedAt": 1782895717385,
        "label": "Amma's birthday cake",
        "items": [
          {
            "product": {
              "id": "CAKE-SAMPLE-001",
              "name": "Chocolate Fudge Birthday Cake",
              "price": 4500,
              "currency": "LKR",
              "image": "https://static2.kapruka.com/product-image/width=330,quality=93,f=auto/shops/cakes/sample.jpg",
              "category": "Cakes"
            },
            "quantity": 1
          }
        ],
        "recipient": {
          "name": "Amma",
          "phone": "0771234567"
        },
        "delivery": {
          "city": "Colombo",
          "address": "12 Galle Road, Colombo 03",
          "date": "2026-07-15"
        },
        "giftMessage": "Happy birthday Amma!",
        "senderName": "Ovindu"
      }
    },
    "checks": [
      "reorderOpensCheckout",
      "checkoutPrefill",
      "noToolLeak"
    ],
    "note": "Session reorder → checkout not carousel-only"
  },
  {
    "id": "X002",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "buy again same as last time"
        }
      ],
      "cart": [],
      "lastOrder": {
        "orderRef": "KP-GEN-X001",
        "placedAt": 1782895717385,
        "label": "Amma's birthday cake",
        "items": [
          {
            "product": {
              "id": "CAKE-SAMPLE-001",
              "name": "Chocolate Fudge Birthday Cake",
              "price": 4500,
              "currency": "LKR",
              "image": "https://static2.kapruka.com/product-image/width=330,quality=93,f=auto/shops/cakes/sample.jpg",
              "category": "Cakes"
            },
            "quantity": 1
          }
        ],
        "recipient": {
          "name": "Amma",
          "phone": "0771234567"
        },
        "delivery": {
          "city": "Colombo",
          "address": "12 Galle Road, Colombo 03",
          "date": "2026-07-15"
        },
        "giftMessage": "Happy birthday Amma!",
        "senderName": "Ovindu"
      }
    },
    "checks": [
      "reorderOpensCheckout",
      "checkoutPrefill",
      "noToolLeak"
    ],
    "note": "Buy again with full delivery snapshot"
  },
  {
    "id": "X003",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "same thing as before machang"
        }
      ],
      "cart": [],
      "lastOrder": {
        "orderRef": "KP-GEN-X001",
        "placedAt": 1782895717385,
        "label": "Amma's birthday cake",
        "items": [
          {
            "product": {
              "id": "CAKE-SAMPLE-001",
              "name": "Chocolate Fudge Birthday Cake",
              "price": 4500,
              "currency": "LKR",
              "image": "https://static2.kapruka.com/product-image/width=330,quality=93,f=auto/shops/cakes/sample.jpg",
              "category": "Cakes"
            },
            "quantity": 1
          }
        ],
        "recipient": {
          "name": "Amma",
          "phone": "0771234567"
        },
        "delivery": {
          "city": "Colombo",
          "address": "12 Galle Road, Colombo 03",
          "date": "2026-07-15"
        },
        "giftMessage": "Happy birthday Amma!",
        "senderName": "Ovindu"
      }
    },
    "checks": [
      "reorderOpensCheckout",
      "noToolLeak"
    ],
    "note": "Tanglish reorder"
  },
  {
    "id": "X004",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "reorder please"
        }
      ],
      "cart": []
    },
    "checks": [
      [
        "text",
        "order|previous|first|KP-|last"
      ],
      "noToolLeak"
    ],
    "note": "No history — honest fallback"
  },
  {
    "id": "X005",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "reorder KP12345"
        }
      ],
      "cart": []
    },
    "checks": [
      "notEmpty",
      "noToolLeak"
    ],
    "note": "Reorder by Kapruka ref via track_order"
  },
  {
    "id": "X006",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "order again"
        }
      ],
      "cart": [],
      "lastOrder": {
        "orderRef": "KP-GEN-X001",
        "placedAt": 1782895717385,
        "label": "Amma's birthday cake",
        "items": [
          {
            "product": {
              "id": "CAKE-SAMPLE-001",
              "name": "Chocolate Fudge Birthday Cake",
              "price": 4500,
              "currency": "LKR",
              "image": "https://static2.kapruka.com/product-image/width=330,quality=93,f=auto/shops/cakes/sample.jpg",
              "category": "Cakes"
            },
            "quantity": 1
          }
        ],
        "recipient": {
          "name": "Amma",
          "phone": "0771234567"
        },
        "delivery": {
          "city": "Colombo",
          "address": "12 Galle Road, Colombo 03",
          "date": "2020-01-01"
        },
        "giftMessage": "Happy birthday Amma!",
        "senderName": "Ovindu"
      }
    },
    "checks": [
      "reorderOpensCheckout",
      "noToolLeak"
    ],
    "note": "Stale delivery date — should bump not fail"
  },
  {
    "id": "X007",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "order again"
        }
      ],
      "cart": [],
      "lastOrder": {
        "orderRef": "KP-GEN-X010",
        "placedAt": 1782895717385,
        "label": "Amma's birthday cake",
        "items": [
          {
            "product": {
              "id": "CAKE-SAMPLE-001",
              "name": "Chocolate Fudge Birthday Cake",
              "price": 4500,
              "currency": "LKR",
              "image": "https://static2.kapruka.com/product-image/width=330,quality=93,f=auto/shops/cakes/sample.jpg",
              "category": "Cakes"
            },
            "quantity": 1
          }
        ],
        "recipient": {
          "name": "Amma",
          "phone": "0771234567"
        },
        "delivery": {
          "city": "Colombo",
          "address": "12 Galle Road, Colombo 03",
          "date": "2026-07-15"
        },
        "giftMessage": "Happy birthday Amma!",
        "senderName": "Ovindu"
      }
    },
    "checks": [
      "reorderOpensCheckout",
      "checkoutPrefill",
      "noToolLeak"
    ],
    "note": "Generated reorder 0 — with history"
  },
  {
    "id": "X008",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "buy again"
        }
      ],
      "cart": [],
      "lastOrder": {
        "orderRef": "KP-GEN-X011",
        "placedAt": 1782895717385,
        "label": "Amma's birthday cake",
        "items": [
          {
            "product": {
              "id": "CAKE-SAMPLE-001",
              "name": "Chocolate Fudge Birthday Cake",
              "price": 4500,
              "currency": "LKR",
              "image": "https://static2.kapruka.com/product-image/width=330,quality=93,f=auto/shops/cakes/sample.jpg",
              "category": "Cakes"
            },
            "quantity": 1
          }
        ],
        "recipient": {
          "name": "Amma",
          "phone": "0771234567"
        },
        "delivery": {
          "city": "Kandy",
          "address": "12 Galle Road, Colombo 03",
          "date": "2026-07-15"
        },
        "giftMessage": "Happy birthday Amma!",
        "senderName": "Ovindu"
      }
    },
    "checks": [
      "reorderOpensCheckout",
      "checkoutPrefill",
      "noToolLeak"
    ],
    "note": "Generated reorder 1 — with history"
  },
  {
    "id": "X009",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "same as last"
        }
      ],
      "cart": [],
      "lastOrder": {
        "orderRef": "KP-GEN-X012",
        "placedAt": 1782895717385,
        "label": "Amma's birthday cake",
        "items": [
          {
            "product": {
              "id": "CAKE-SAMPLE-001",
              "name": "Chocolate Fudge Birthday Cake",
              "price": 4500,
              "currency": "LKR",
              "image": "https://static2.kapruka.com/product-image/width=330,quality=93,f=auto/shops/cakes/sample.jpg",
              "category": "Cakes"
            },
            "quantity": 1
          }
        ],
        "recipient": {
          "name": "Amma",
          "phone": "0771234567"
        },
        "delivery": {
          "city": "Galle",
          "address": "12 Galle Road, Colombo 03",
          "date": "2026-07-15"
        },
        "giftMessage": "Happy birthday Amma!",
        "senderName": "Ovindu"
      }
    },
    "checks": [
      "reorderOpensCheckout",
      "checkoutPrefill",
      "noToolLeak"
    ],
    "note": "Generated reorder 2 — with history"
  },
  {
    "id": "X010",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "repeat my last order"
        }
      ],
      "cart": []
    },
    "checks": [
      [
        "text",
        "order|previous|first|KP-|last"
      ],
      "noToolLeak"
    ],
    "note": "Generated reorder 3 — no history"
  },
  {
    "id": "X011",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "reorder please"
        }
      ],
      "cart": [],
      "lastOrder": {
        "orderRef": "KP-GEN-X014",
        "placedAt": 1782895717385,
        "label": "Amma's birthday cake",
        "items": [
          {
            "product": {
              "id": "CAKE-SAMPLE-001",
              "name": "Chocolate Fudge Birthday Cake",
              "price": 4500,
              "currency": "LKR",
              "image": "https://static2.kapruka.com/product-image/width=330,quality=93,f=auto/shops/cakes/sample.jpg",
              "category": "Cakes"
            },
            "quantity": 1
          }
        ],
        "recipient": {
          "name": "Amma",
          "phone": "0771234567"
        },
        "delivery": {
          "city": "Kandy",
          "address": "12 Galle Road, Colombo 03",
          "date": "2026-07-15"
        },
        "giftMessage": "Happy birthday Amma!",
        "senderName": "Ovindu"
      }
    },
    "checks": [
      "reorderOpensCheckout",
      "checkoutPrefill",
      "noToolLeak"
    ],
    "note": "Generated reorder 4 — with history"
  },
  {
    "id": "X012",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "order again"
        }
      ],
      "cart": [],
      "lastOrder": {
        "orderRef": "KP-GEN-X015",
        "placedAt": 1782895717385,
        "label": "Amma's birthday cake",
        "items": [
          {
            "product": {
              "id": "CAKE-SAMPLE-001",
              "name": "Chocolate Fudge Birthday Cake",
              "price": 4500,
              "currency": "LKR",
              "image": "https://static2.kapruka.com/product-image/width=330,quality=93,f=auto/shops/cakes/sample.jpg",
              "category": "Cakes"
            },
            "quantity": 1
          }
        ],
        "recipient": {
          "name": "Amma",
          "phone": "0771234567"
        },
        "delivery": {
          "city": "Galle",
          "address": "12 Galle Road, Colombo 03",
          "date": "2026-07-15"
        },
        "giftMessage": "Happy birthday Amma!",
        "senderName": "Ovindu"
      }
    },
    "checks": [
      "reorderOpensCheckout",
      "checkoutPrefill",
      "noToolLeak"
    ],
    "note": "Generated reorder 5 — with history"
  },
  {
    "id": "X013",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "buy again"
        }
      ],
      "cart": [],
      "lastOrder": {
        "orderRef": "KP-GEN-X016",
        "placedAt": 1782895717385,
        "label": "Amma's birthday cake",
        "items": [
          {
            "product": {
              "id": "CAKE-SAMPLE-001",
              "name": "Chocolate Fudge Birthday Cake",
              "price": 4500,
              "currency": "LKR",
              "image": "https://static2.kapruka.com/product-image/width=330,quality=93,f=auto/shops/cakes/sample.jpg",
              "category": "Cakes"
            },
            "quantity": 1
          }
        ],
        "recipient": {
          "name": "Amma",
          "phone": "0771234567"
        },
        "delivery": {
          "city": "Colombo",
          "address": "12 Galle Road, Colombo 03",
          "date": "2026-07-15"
        },
        "giftMessage": "Happy birthday Amma!",
        "senderName": "Ovindu"
      }
    },
    "checks": [
      "reorderOpensCheckout",
      "checkoutPrefill",
      "noToolLeak"
    ],
    "note": "Generated reorder 6 — with history"
  },
  {
    "id": "X014",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "same as last"
        }
      ],
      "cart": []
    },
    "checks": [
      [
        "text",
        "order|previous|first|KP-|last"
      ],
      "noToolLeak"
    ],
    "note": "Generated reorder 7 — no history"
  },
  {
    "id": "X015",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "repeat my last order"
        }
      ],
      "cart": [],
      "lastOrder": {
        "orderRef": "KP-GEN-X018",
        "placedAt": 1782895717385,
        "label": "Amma's birthday cake",
        "items": [
          {
            "product": {
              "id": "CAKE-SAMPLE-001",
              "name": "Chocolate Fudge Birthday Cake",
              "price": 4500,
              "currency": "LKR",
              "image": "https://static2.kapruka.com/product-image/width=330,quality=93,f=auto/shops/cakes/sample.jpg",
              "category": "Cakes"
            },
            "quantity": 1
          }
        ],
        "recipient": {
          "name": "Amma",
          "phone": "0771234567"
        },
        "delivery": {
          "city": "Galle",
          "address": "12 Galle Road, Colombo 03",
          "date": "2026-07-15"
        },
        "giftMessage": "Happy birthday Amma!",
        "senderName": "Ovindu"
      }
    },
    "checks": [
      "reorderOpensCheckout",
      "checkoutPrefill",
      "noToolLeak"
    ],
    "note": "Generated reorder 8 — with history"
  },
  {
    "id": "X016",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "reorder please"
        }
      ],
      "cart": [],
      "lastOrder": {
        "orderRef": "KP-GEN-X019",
        "placedAt": 1782895717385,
        "label": "Amma's birthday cake",
        "items": [
          {
            "product": {
              "id": "CAKE-SAMPLE-001",
              "name": "Chocolate Fudge Birthday Cake",
              "price": 4500,
              "currency": "LKR",
              "image": "https://static2.kapruka.com/product-image/width=330,quality=93,f=auto/shops/cakes/sample.jpg",
              "category": "Cakes"
            },
            "quantity": 1
          }
        ],
        "recipient": {
          "name": "Amma",
          "phone": "0771234567"
        },
        "delivery": {
          "city": "Colombo",
          "address": "12 Galle Road, Colombo 03",
          "date": "2026-07-15"
        },
        "giftMessage": "Happy birthday Amma!",
        "senderName": "Ovindu"
      }
    },
    "checks": [
      "reorderOpensCheckout",
      "checkoutPrefill",
      "noToolLeak"
    ],
    "note": "Generated reorder 9 — with history"
  },
  {
    "id": "X017",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "order again"
        }
      ],
      "cart": [],
      "lastOrder": {
        "orderRef": "KP-GEN-X020",
        "placedAt": 1782895717385,
        "label": "Amma's birthday cake",
        "items": [
          {
            "product": {
              "id": "CAKE-SAMPLE-001",
              "name": "Chocolate Fudge Birthday Cake",
              "price": 4500,
              "currency": "LKR",
              "image": "https://static2.kapruka.com/product-image/width=330,quality=93,f=auto/shops/cakes/sample.jpg",
              "category": "Cakes"
            },
            "quantity": 1
          }
        ],
        "recipient": {
          "name": "Amma",
          "phone": "0771234567"
        },
        "delivery": {
          "city": "Kandy",
          "address": "12 Galle Road, Colombo 03",
          "date": "2026-07-15"
        },
        "giftMessage": "Happy birthday Amma!",
        "senderName": "Ovindu"
      }
    },
    "checks": [
      "reorderOpensCheckout",
      "checkoutPrefill",
      "noToolLeak"
    ],
    "note": "Generated reorder 10 — with history"
  },
  {
    "id": "X018",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "buy again"
        }
      ],
      "cart": []
    },
    "checks": [
      [
        "text",
        "order|previous|first|KP-|last"
      ],
      "noToolLeak"
    ],
    "note": "Generated reorder 11 — no history"
  },
  {
    "id": "X019",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "same as last"
        }
      ],
      "cart": [],
      "lastOrder": {
        "orderRef": "KP-GEN-X022",
        "placedAt": 1782895717385,
        "label": "Amma's birthday cake",
        "items": [
          {
            "product": {
              "id": "CAKE-SAMPLE-001",
              "name": "Chocolate Fudge Birthday Cake",
              "price": 4500,
              "currency": "LKR",
              "image": "https://static2.kapruka.com/product-image/width=330,quality=93,f=auto/shops/cakes/sample.jpg",
              "category": "Cakes"
            },
            "quantity": 1
          }
        ],
        "recipient": {
          "name": "Amma",
          "phone": "0771234567"
        },
        "delivery": {
          "city": "Colombo",
          "address": "12 Galle Road, Colombo 03",
          "date": "2026-07-15"
        },
        "giftMessage": "Happy birthday Amma!",
        "senderName": "Ovindu"
      }
    },
    "checks": [
      "reorderOpensCheckout",
      "checkoutPrefill",
      "noToolLeak"
    ],
    "note": "Generated reorder 12 — with history"
  },
  {
    "id": "X020",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "repeat my last order"
        }
      ],
      "cart": [],
      "lastOrder": {
        "orderRef": "KP-GEN-X023",
        "placedAt": 1782895717385,
        "label": "Amma's birthday cake",
        "items": [
          {
            "product": {
              "id": "CAKE-SAMPLE-001",
              "name": "Chocolate Fudge Birthday Cake",
              "price": 4500,
              "currency": "LKR",
              "image": "https://static2.kapruka.com/product-image/width=330,quality=93,f=auto/shops/cakes/sample.jpg",
              "category": "Cakes"
            },
            "quantity": 1
          }
        ],
        "recipient": {
          "name": "Amma",
          "phone": "0771234567"
        },
        "delivery": {
          "city": "Kandy",
          "address": "12 Galle Road, Colombo 03",
          "date": "2026-07-15"
        },
        "giftMessage": "Happy birthday Amma!",
        "senderName": "Ovindu"
      }
    },
    "checks": [
      "reorderOpensCheckout",
      "checkoutPrefill",
      "noToolLeak"
    ],
    "note": "Generated reorder 13 — with history"
  },
  {
    "id": "X021",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "reorder please"
        }
      ],
      "cart": [],
      "lastOrder": {
        "orderRef": "KP-GEN-X024",
        "placedAt": 1782895717385,
        "label": "Amma's birthday cake",
        "items": [
          {
            "product": {
              "id": "CAKE-SAMPLE-001",
              "name": "Chocolate Fudge Birthday Cake",
              "price": 4500,
              "currency": "LKR",
              "image": "https://static2.kapruka.com/product-image/width=330,quality=93,f=auto/shops/cakes/sample.jpg",
              "category": "Cakes"
            },
            "quantity": 1
          }
        ],
        "recipient": {
          "name": "Amma",
          "phone": "0771234567"
        },
        "delivery": {
          "city": "Galle",
          "address": "12 Galle Road, Colombo 03",
          "date": "2026-07-15"
        },
        "giftMessage": "Happy birthday Amma!",
        "senderName": "Ovindu"
      }
    },
    "checks": [
      "reorderOpensCheckout",
      "checkoutPrefill",
      "noToolLeak"
    ],
    "note": "Generated reorder 14 — with history"
  },
  {
    "id": "X022",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "order again"
        }
      ],
      "cart": []
    },
    "checks": [
      [
        "text",
        "order|previous|first|KP-|last"
      ],
      "noToolLeak"
    ],
    "note": "Generated reorder 15 — no history"
  },
  {
    "id": "X023",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "buy again"
        }
      ],
      "cart": [],
      "lastOrder": {
        "orderRef": "KP-GEN-X026",
        "placedAt": 1782895717385,
        "label": "Amma's birthday cake",
        "items": [
          {
            "product": {
              "id": "CAKE-SAMPLE-001",
              "name": "Chocolate Fudge Birthday Cake",
              "price": 4500,
              "currency": "LKR",
              "image": "https://static2.kapruka.com/product-image/width=330,quality=93,f=auto/shops/cakes/sample.jpg",
              "category": "Cakes"
            },
            "quantity": 1
          }
        ],
        "recipient": {
          "name": "Amma",
          "phone": "0771234567"
        },
        "delivery": {
          "city": "Kandy",
          "address": "12 Galle Road, Colombo 03",
          "date": "2026-07-15"
        },
        "giftMessage": "Happy birthday Amma!",
        "senderName": "Ovindu"
      }
    },
    "checks": [
      "reorderOpensCheckout",
      "checkoutPrefill",
      "noToolLeak"
    ],
    "note": "Generated reorder 16 — with history"
  },
  {
    "id": "X024",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "same as last"
        }
      ],
      "cart": [],
      "lastOrder": {
        "orderRef": "KP-GEN-X027",
        "placedAt": 1782895717385,
        "label": "Amma's birthday cake",
        "items": [
          {
            "product": {
              "id": "CAKE-SAMPLE-001",
              "name": "Chocolate Fudge Birthday Cake",
              "price": 4500,
              "currency": "LKR",
              "image": "https://static2.kapruka.com/product-image/width=330,quality=93,f=auto/shops/cakes/sample.jpg",
              "category": "Cakes"
            },
            "quantity": 1
          }
        ],
        "recipient": {
          "name": "Amma",
          "phone": "0771234567"
        },
        "delivery": {
          "city": "Galle",
          "address": "12 Galle Road, Colombo 03",
          "date": "2026-07-15"
        },
        "giftMessage": "Happy birthday Amma!",
        "senderName": "Ovindu"
      }
    },
    "checks": [
      "reorderOpensCheckout",
      "checkoutPrefill",
      "noToolLeak"
    ],
    "note": "Generated reorder 17 — with history"
  },
  {
    "id": "X025",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "repeat my last order"
        }
      ],
      "cart": [],
      "lastOrder": {
        "orderRef": "KP-GEN-X028",
        "placedAt": 1782895717385,
        "label": "Amma's birthday cake",
        "items": [
          {
            "product": {
              "id": "CAKE-SAMPLE-001",
              "name": "Chocolate Fudge Birthday Cake",
              "price": 4500,
              "currency": "LKR",
              "image": "https://static2.kapruka.com/product-image/width=330,quality=93,f=auto/shops/cakes/sample.jpg",
              "category": "Cakes"
            },
            "quantity": 1
          }
        ],
        "recipient": {
          "name": "Amma",
          "phone": "0771234567"
        },
        "delivery": {
          "city": "Colombo",
          "address": "12 Galle Road, Colombo 03",
          "date": "2026-07-15"
        },
        "giftMessage": "Happy birthday Amma!",
        "senderName": "Ovindu"
      }
    },
    "checks": [
      "reorderOpensCheckout",
      "checkoutPrefill",
      "noToolLeak"
    ],
    "note": "Generated reorder 18 — with history"
  },
  {
    "id": "X026",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "reorder please"
        }
      ],
      "cart": []
    },
    "checks": [
      [
        "text",
        "order|previous|first|KP-|last"
      ],
      "noToolLeak"
    ],
    "note": "Generated reorder 19 — no history"
  },
  {
    "id": "X027",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "order again"
        }
      ],
      "cart": [],
      "lastOrder": {
        "orderRef": "KP-GEN-X030",
        "placedAt": 1782895717385,
        "label": "Amma's birthday cake",
        "items": [
          {
            "product": {
              "id": "CAKE-SAMPLE-001",
              "name": "Chocolate Fudge Birthday Cake",
              "price": 4500,
              "currency": "LKR",
              "image": "https://static2.kapruka.com/product-image/width=330,quality=93,f=auto/shops/cakes/sample.jpg",
              "category": "Cakes"
            },
            "quantity": 1
          }
        ],
        "recipient": {
          "name": "Amma",
          "phone": "0771234567"
        },
        "delivery": {
          "city": "Galle",
          "address": "12 Galle Road, Colombo 03",
          "date": "2026-07-15"
        },
        "giftMessage": "Happy birthday Amma!",
        "senderName": "Ovindu"
      }
    },
    "checks": [
      "reorderOpensCheckout",
      "checkoutPrefill",
      "noToolLeak"
    ],
    "note": "Generated reorder 20 — with history"
  },
  {
    "id": "X028",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "buy again"
        }
      ],
      "cart": [],
      "lastOrder": {
        "orderRef": "KP-GEN-X031",
        "placedAt": 1782895717385,
        "label": "Amma's birthday cake",
        "items": [
          {
            "product": {
              "id": "CAKE-SAMPLE-001",
              "name": "Chocolate Fudge Birthday Cake",
              "price": 4500,
              "currency": "LKR",
              "image": "https://static2.kapruka.com/product-image/width=330,quality=93,f=auto/shops/cakes/sample.jpg",
              "category": "Cakes"
            },
            "quantity": 1
          }
        ],
        "recipient": {
          "name": "Amma",
          "phone": "0771234567"
        },
        "delivery": {
          "city": "Colombo",
          "address": "12 Galle Road, Colombo 03",
          "date": "2026-07-15"
        },
        "giftMessage": "Happy birthday Amma!",
        "senderName": "Ovindu"
      }
    },
    "checks": [
      "reorderOpensCheckout",
      "checkoutPrefill",
      "noToolLeak"
    ],
    "note": "Generated reorder 21 — with history"
  },
  {
    "id": "X029",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "same as last"
        }
      ],
      "cart": [],
      "lastOrder": {
        "orderRef": "KP-GEN-X032",
        "placedAt": 1782895717385,
        "label": "Amma's birthday cake",
        "items": [
          {
            "product": {
              "id": "CAKE-SAMPLE-001",
              "name": "Chocolate Fudge Birthday Cake",
              "price": 4500,
              "currency": "LKR",
              "image": "https://static2.kapruka.com/product-image/width=330,quality=93,f=auto/shops/cakes/sample.jpg",
              "category": "Cakes"
            },
            "quantity": 1
          }
        ],
        "recipient": {
          "name": "Amma",
          "phone": "0771234567"
        },
        "delivery": {
          "city": "Kandy",
          "address": "12 Galle Road, Colombo 03",
          "date": "2026-07-15"
        },
        "giftMessage": "Happy birthday Amma!",
        "senderName": "Ovindu"
      }
    },
    "checks": [
      "reorderOpensCheckout",
      "checkoutPrefill",
      "noToolLeak"
    ],
    "note": "Generated reorder 22 — with history"
  },
  {
    "id": "X030",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "repeat my last order"
        }
      ],
      "cart": []
    },
    "checks": [
      [
        "text",
        "order|previous|first|KP-|last"
      ],
      "noToolLeak"
    ],
    "note": "Generated reorder 23 — no history"
  },
  {
    "id": "X031",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "reorder please"
        }
      ],
      "cart": [],
      "lastOrder": {
        "orderRef": "KP-GEN-X034",
        "placedAt": 1782895717385,
        "label": "Amma's birthday cake",
        "items": [
          {
            "product": {
              "id": "CAKE-SAMPLE-001",
              "name": "Chocolate Fudge Birthday Cake",
              "price": 4500,
              "currency": "LKR",
              "image": "https://static2.kapruka.com/product-image/width=330,quality=93,f=auto/shops/cakes/sample.jpg",
              "category": "Cakes"
            },
            "quantity": 1
          }
        ],
        "recipient": {
          "name": "Amma",
          "phone": "0771234567"
        },
        "delivery": {
          "city": "Colombo",
          "address": "12 Galle Road, Colombo 03",
          "date": "2026-07-15"
        },
        "giftMessage": "Happy birthday Amma!",
        "senderName": "Ovindu"
      }
    },
    "checks": [
      "reorderOpensCheckout",
      "checkoutPrefill",
      "noToolLeak"
    ],
    "note": "Generated reorder 24 — with history"
  },
  {
    "id": "X032",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "order again"
        }
      ],
      "cart": [],
      "lastOrder": {
        "orderRef": "KP-GEN-X035",
        "placedAt": 1782895717385,
        "label": "Amma's birthday cake",
        "items": [
          {
            "product": {
              "id": "CAKE-SAMPLE-001",
              "name": "Chocolate Fudge Birthday Cake",
              "price": 4500,
              "currency": "LKR",
              "image": "https://static2.kapruka.com/product-image/width=330,quality=93,f=auto/shops/cakes/sample.jpg",
              "category": "Cakes"
            },
            "quantity": 1
          }
        ],
        "recipient": {
          "name": "Amma",
          "phone": "0771234567"
        },
        "delivery": {
          "city": "Kandy",
          "address": "12 Galle Road, Colombo 03",
          "date": "2026-07-15"
        },
        "giftMessage": "Happy birthday Amma!",
        "senderName": "Ovindu"
      }
    },
    "checks": [
      "reorderOpensCheckout",
      "checkoutPrefill",
      "noToolLeak"
    ],
    "note": "Generated reorder 25 — with history"
  },
  {
    "id": "X033",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "buy again"
        }
      ],
      "cart": [],
      "lastOrder": {
        "orderRef": "KP-GEN-X036",
        "placedAt": 1782895717385,
        "label": "Amma's birthday cake",
        "items": [
          {
            "product": {
              "id": "CAKE-SAMPLE-001",
              "name": "Chocolate Fudge Birthday Cake",
              "price": 4500,
              "currency": "LKR",
              "image": "https://static2.kapruka.com/product-image/width=330,quality=93,f=auto/shops/cakes/sample.jpg",
              "category": "Cakes"
            },
            "quantity": 1
          }
        ],
        "recipient": {
          "name": "Amma",
          "phone": "0771234567"
        },
        "delivery": {
          "city": "Galle",
          "address": "12 Galle Road, Colombo 03",
          "date": "2026-07-15"
        },
        "giftMessage": "Happy birthday Amma!",
        "senderName": "Ovindu"
      }
    },
    "checks": [
      "reorderOpensCheckout",
      "checkoutPrefill",
      "noToolLeak"
    ],
    "note": "Generated reorder 26 — with history"
  },
  {
    "id": "X034",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "same as last"
        }
      ],
      "cart": []
    },
    "checks": [
      [
        "text",
        "order|previous|first|KP-|last"
      ],
      "noToolLeak"
    ],
    "note": "Generated reorder 27 — no history"
  },
  {
    "id": "X035",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "repeat my last order"
        }
      ],
      "cart": [],
      "lastOrder": {
        "orderRef": "KP-GEN-X038",
        "placedAt": 1782895717385,
        "label": "Amma's birthday cake",
        "items": [
          {
            "product": {
              "id": "CAKE-SAMPLE-001",
              "name": "Chocolate Fudge Birthday Cake",
              "price": 4500,
              "currency": "LKR",
              "image": "https://static2.kapruka.com/product-image/width=330,quality=93,f=auto/shops/cakes/sample.jpg",
              "category": "Cakes"
            },
            "quantity": 1
          }
        ],
        "recipient": {
          "name": "Amma",
          "phone": "0771234567"
        },
        "delivery": {
          "city": "Kandy",
          "address": "12 Galle Road, Colombo 03",
          "date": "2026-07-15"
        },
        "giftMessage": "Happy birthday Amma!",
        "senderName": "Ovindu"
      }
    },
    "checks": [
      "reorderOpensCheckout",
      "checkoutPrefill",
      "noToolLeak"
    ],
    "note": "Generated reorder 28 — with history"
  },
  {
    "id": "X036",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "reorder please"
        }
      ],
      "cart": [],
      "lastOrder": {
        "orderRef": "KP-GEN-X039",
        "placedAt": 1782895717385,
        "label": "Amma's birthday cake",
        "items": [
          {
            "product": {
              "id": "CAKE-SAMPLE-001",
              "name": "Chocolate Fudge Birthday Cake",
              "price": 4500,
              "currency": "LKR",
              "image": "https://static2.kapruka.com/product-image/width=330,quality=93,f=auto/shops/cakes/sample.jpg",
              "category": "Cakes"
            },
            "quantity": 1
          }
        ],
        "recipient": {
          "name": "Amma",
          "phone": "0771234567"
        },
        "delivery": {
          "city": "Galle",
          "address": "12 Galle Road, Colombo 03",
          "date": "2026-07-15"
        },
        "giftMessage": "Happy birthday Amma!",
        "senderName": "Ovindu"
      }
    },
    "checks": [
      "reorderOpensCheckout",
      "checkoutPrefill",
      "noToolLeak"
    ],
    "note": "Generated reorder 29 — with history"
  },
  {
    "id": "X037",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "order again"
        }
      ],
      "cart": [],
      "lastOrder": {
        "orderRef": "KP-GEN-X040",
        "placedAt": 1782895717385,
        "label": "Amma's birthday cake",
        "items": [
          {
            "product": {
              "id": "CAKE-SAMPLE-001",
              "name": "Chocolate Fudge Birthday Cake",
              "price": 4500,
              "currency": "LKR",
              "image": "https://static2.kapruka.com/product-image/width=330,quality=93,f=auto/shops/cakes/sample.jpg",
              "category": "Cakes"
            },
            "quantity": 1
          }
        ],
        "recipient": {
          "name": "Amma",
          "phone": "0771234567"
        },
        "delivery": {
          "city": "Colombo",
          "address": "12 Galle Road, Colombo 03",
          "date": "2026-07-15"
        },
        "giftMessage": "Happy birthday Amma!",
        "senderName": "Ovindu"
      }
    },
    "checks": [
      "reorderOpensCheckout",
      "checkoutPrefill",
      "noToolLeak"
    ],
    "note": "Generated reorder 30 — with history"
  },
  {
    "id": "X038",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "buy again"
        }
      ],
      "cart": []
    },
    "checks": [
      [
        "text",
        "order|previous|first|KP-|last"
      ],
      "noToolLeak"
    ],
    "note": "Generated reorder 31 — no history"
  },
  {
    "id": "X039",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "same as last"
        }
      ],
      "cart": [],
      "lastOrder": {
        "orderRef": "KP-GEN-X042",
        "placedAt": 1782895717385,
        "label": "Amma's birthday cake",
        "items": [
          {
            "product": {
              "id": "CAKE-SAMPLE-001",
              "name": "Chocolate Fudge Birthday Cake",
              "price": 4500,
              "currency": "LKR",
              "image": "https://static2.kapruka.com/product-image/width=330,quality=93,f=auto/shops/cakes/sample.jpg",
              "category": "Cakes"
            },
            "quantity": 1
          }
        ],
        "recipient": {
          "name": "Amma",
          "phone": "0771234567"
        },
        "delivery": {
          "city": "Galle",
          "address": "12 Galle Road, Colombo 03",
          "date": "2026-07-15"
        },
        "giftMessage": "Happy birthday Amma!",
        "senderName": "Ovindu"
      }
    },
    "checks": [
      "reorderOpensCheckout",
      "checkoutPrefill",
      "noToolLeak"
    ],
    "note": "Generated reorder 32 — with history"
  },
  {
    "id": "X040",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "repeat my last order"
        }
      ],
      "cart": [],
      "lastOrder": {
        "orderRef": "KP-GEN-X043",
        "placedAt": 1782895717385,
        "label": "Amma's birthday cake",
        "items": [
          {
            "product": {
              "id": "CAKE-SAMPLE-001",
              "name": "Chocolate Fudge Birthday Cake",
              "price": 4500,
              "currency": "LKR",
              "image": "https://static2.kapruka.com/product-image/width=330,quality=93,f=auto/shops/cakes/sample.jpg",
              "category": "Cakes"
            },
            "quantity": 1
          }
        ],
        "recipient": {
          "name": "Amma",
          "phone": "0771234567"
        },
        "delivery": {
          "city": "Colombo",
          "address": "12 Galle Road, Colombo 03",
          "date": "2026-07-15"
        },
        "giftMessage": "Happy birthday Amma!",
        "senderName": "Ovindu"
      }
    },
    "checks": [
      "reorderOpensCheckout",
      "checkoutPrefill",
      "noToolLeak"
    ],
    "note": "Generated reorder 33 — with history"
  },
  {
    "id": "X041",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "reorder please"
        }
      ],
      "cart": [],
      "lastOrder": {
        "orderRef": "KP-GEN-X044",
        "placedAt": 1782895717385,
        "label": "Amma's birthday cake",
        "items": [
          {
            "product": {
              "id": "CAKE-SAMPLE-001",
              "name": "Chocolate Fudge Birthday Cake",
              "price": 4500,
              "currency": "LKR",
              "image": "https://static2.kapruka.com/product-image/width=330,quality=93,f=auto/shops/cakes/sample.jpg",
              "category": "Cakes"
            },
            "quantity": 1
          }
        ],
        "recipient": {
          "name": "Amma",
          "phone": "0771234567"
        },
        "delivery": {
          "city": "Kandy",
          "address": "12 Galle Road, Colombo 03",
          "date": "2026-07-15"
        },
        "giftMessage": "Happy birthday Amma!",
        "senderName": "Ovindu"
      }
    },
    "checks": [
      "reorderOpensCheckout",
      "checkoutPrefill",
      "noToolLeak"
    ],
    "note": "Generated reorder 34 — with history"
  },
  {
    "id": "X042",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "order again"
        }
      ],
      "cart": []
    },
    "checks": [
      [
        "text",
        "order|previous|first|KP-|last"
      ],
      "noToolLeak"
    ],
    "note": "Generated reorder 35 — no history"
  },
  {
    "id": "X043",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "buy again"
        }
      ],
      "cart": [],
      "lastOrder": {
        "orderRef": "KP-GEN-X046",
        "placedAt": 1782895717385,
        "label": "Amma's birthday cake",
        "items": [
          {
            "product": {
              "id": "CAKE-SAMPLE-001",
              "name": "Chocolate Fudge Birthday Cake",
              "price": 4500,
              "currency": "LKR",
              "image": "https://static2.kapruka.com/product-image/width=330,quality=93,f=auto/shops/cakes/sample.jpg",
              "category": "Cakes"
            },
            "quantity": 1
          }
        ],
        "recipient": {
          "name": "Amma",
          "phone": "0771234567"
        },
        "delivery": {
          "city": "Colombo",
          "address": "12 Galle Road, Colombo 03",
          "date": "2026-07-15"
        },
        "giftMessage": "Happy birthday Amma!",
        "senderName": "Ovindu"
      }
    },
    "checks": [
      "reorderOpensCheckout",
      "checkoutPrefill",
      "noToolLeak"
    ],
    "note": "Generated reorder 36 — with history"
  },
  {
    "id": "X044",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "same as last"
        }
      ],
      "cart": [],
      "lastOrder": {
        "orderRef": "KP-GEN-X047",
        "placedAt": 1782895717385,
        "label": "Amma's birthday cake",
        "items": [
          {
            "product": {
              "id": "CAKE-SAMPLE-001",
              "name": "Chocolate Fudge Birthday Cake",
              "price": 4500,
              "currency": "LKR",
              "image": "https://static2.kapruka.com/product-image/width=330,quality=93,f=auto/shops/cakes/sample.jpg",
              "category": "Cakes"
            },
            "quantity": 1
          }
        ],
        "recipient": {
          "name": "Amma",
          "phone": "0771234567"
        },
        "delivery": {
          "city": "Kandy",
          "address": "12 Galle Road, Colombo 03",
          "date": "2026-07-15"
        },
        "giftMessage": "Happy birthday Amma!",
        "senderName": "Ovindu"
      }
    },
    "checks": [
      "reorderOpensCheckout",
      "checkoutPrefill",
      "noToolLeak"
    ],
    "note": "Generated reorder 37 — with history"
  },
  {
    "id": "X045",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "repeat my last order"
        }
      ],
      "cart": [],
      "lastOrder": {
        "orderRef": "KP-GEN-X048",
        "placedAt": 1782895717385,
        "label": "Amma's birthday cake",
        "items": [
          {
            "product": {
              "id": "CAKE-SAMPLE-001",
              "name": "Chocolate Fudge Birthday Cake",
              "price": 4500,
              "currency": "LKR",
              "image": "https://static2.kapruka.com/product-image/width=330,quality=93,f=auto/shops/cakes/sample.jpg",
              "category": "Cakes"
            },
            "quantity": 1
          }
        ],
        "recipient": {
          "name": "Amma",
          "phone": "0771234567"
        },
        "delivery": {
          "city": "Galle",
          "address": "12 Galle Road, Colombo 03",
          "date": "2026-07-15"
        },
        "giftMessage": "Happy birthday Amma!",
        "senderName": "Ovindu"
      }
    },
    "checks": [
      "reorderOpensCheckout",
      "checkoutPrefill",
      "noToolLeak"
    ],
    "note": "Generated reorder 38 — with history"
  },
  {
    "id": "X046",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "reorder please"
        }
      ],
      "cart": []
    },
    "checks": [
      [
        "text",
        "order|previous|first|KP-|last"
      ],
      "noToolLeak"
    ],
    "note": "Generated reorder 39 — no history"
  },
  {
    "id": "X047",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "order again"
        }
      ],
      "cart": [],
      "lastOrder": {
        "orderRef": "KP-GEN-X050",
        "placedAt": 1782895717385,
        "label": "Amma's birthday cake",
        "items": [
          {
            "product": {
              "id": "CAKE-SAMPLE-001",
              "name": "Chocolate Fudge Birthday Cake",
              "price": 4500,
              "currency": "LKR",
              "image": "https://static2.kapruka.com/product-image/width=330,quality=93,f=auto/shops/cakes/sample.jpg",
              "category": "Cakes"
            },
            "quantity": 1
          }
        ],
        "recipient": {
          "name": "Amma",
          "phone": "0771234567"
        },
        "delivery": {
          "city": "Kandy",
          "address": "12 Galle Road, Colombo 03",
          "date": "2026-07-15"
        },
        "giftMessage": "Happy birthday Amma!",
        "senderName": "Ovindu"
      }
    },
    "checks": [
      "reorderOpensCheckout",
      "checkoutPrefill",
      "noToolLeak"
    ],
    "note": "Generated reorder 40 — with history"
  },
  {
    "id": "X048",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "buy again"
        }
      ],
      "cart": [],
      "lastOrder": {
        "orderRef": "KP-GEN-X051",
        "placedAt": 1782895717385,
        "label": "Amma's birthday cake",
        "items": [
          {
            "product": {
              "id": "CAKE-SAMPLE-001",
              "name": "Chocolate Fudge Birthday Cake",
              "price": 4500,
              "currency": "LKR",
              "image": "https://static2.kapruka.com/product-image/width=330,quality=93,f=auto/shops/cakes/sample.jpg",
              "category": "Cakes"
            },
            "quantity": 1
          }
        ],
        "recipient": {
          "name": "Amma",
          "phone": "0771234567"
        },
        "delivery": {
          "city": "Galle",
          "address": "12 Galle Road, Colombo 03",
          "date": "2026-07-15"
        },
        "giftMessage": "Happy birthday Amma!",
        "senderName": "Ovindu"
      }
    },
    "checks": [
      "reorderOpensCheckout",
      "checkoutPrefill",
      "noToolLeak"
    ],
    "note": "Generated reorder 41 — with history"
  },
  {
    "id": "X049",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "same as last"
        }
      ],
      "cart": [],
      "lastOrder": {
        "orderRef": "KP-GEN-X052",
        "placedAt": 1782895717385,
        "label": "Amma's birthday cake",
        "items": [
          {
            "product": {
              "id": "CAKE-SAMPLE-001",
              "name": "Chocolate Fudge Birthday Cake",
              "price": 4500,
              "currency": "LKR",
              "image": "https://static2.kapruka.com/product-image/width=330,quality=93,f=auto/shops/cakes/sample.jpg",
              "category": "Cakes"
            },
            "quantity": 1
          }
        ],
        "recipient": {
          "name": "Amma",
          "phone": "0771234567"
        },
        "delivery": {
          "city": "Colombo",
          "address": "12 Galle Road, Colombo 03",
          "date": "2026-07-15"
        },
        "giftMessage": "Happy birthday Amma!",
        "senderName": "Ovindu"
      }
    },
    "checks": [
      "reorderOpensCheckout",
      "checkoutPrefill",
      "noToolLeak"
    ],
    "note": "Generated reorder 42 — with history"
  },
  {
    "id": "X050",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "repeat my last order"
        }
      ],
      "cart": []
    },
    "checks": [
      [
        "text",
        "order|previous|first|KP-|last"
      ],
      "noToolLeak"
    ],
    "note": "Generated reorder 43 — no history"
  },
  {
    "id": "X051",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "reorder please"
        }
      ],
      "cart": [],
      "lastOrder": {
        "orderRef": "KP-GEN-X054",
        "placedAt": 1782895717385,
        "label": "Amma's birthday cake",
        "items": [
          {
            "product": {
              "id": "CAKE-SAMPLE-001",
              "name": "Chocolate Fudge Birthday Cake",
              "price": 4500,
              "currency": "LKR",
              "image": "https://static2.kapruka.com/product-image/width=330,quality=93,f=auto/shops/cakes/sample.jpg",
              "category": "Cakes"
            },
            "quantity": 1
          }
        ],
        "recipient": {
          "name": "Amma",
          "phone": "0771234567"
        },
        "delivery": {
          "city": "Galle",
          "address": "12 Galle Road, Colombo 03",
          "date": "2026-07-15"
        },
        "giftMessage": "Happy birthday Amma!",
        "senderName": "Ovindu"
      }
    },
    "checks": [
      "reorderOpensCheckout",
      "checkoutPrefill",
      "noToolLeak"
    ],
    "note": "Generated reorder 44 — with history"
  },
  {
    "id": "X052",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "order again"
        }
      ],
      "cart": [],
      "lastOrder": {
        "orderRef": "KP-GEN-X055",
        "placedAt": 1782895717385,
        "label": "Amma's birthday cake",
        "items": [
          {
            "product": {
              "id": "CAKE-SAMPLE-001",
              "name": "Chocolate Fudge Birthday Cake",
              "price": 4500,
              "currency": "LKR",
              "image": "https://static2.kapruka.com/product-image/width=330,quality=93,f=auto/shops/cakes/sample.jpg",
              "category": "Cakes"
            },
            "quantity": 1
          }
        ],
        "recipient": {
          "name": "Amma",
          "phone": "0771234567"
        },
        "delivery": {
          "city": "Colombo",
          "address": "12 Galle Road, Colombo 03",
          "date": "2026-07-15"
        },
        "giftMessage": "Happy birthday Amma!",
        "senderName": "Ovindu"
      }
    },
    "checks": [
      "reorderOpensCheckout",
      "checkoutPrefill",
      "noToolLeak"
    ],
    "note": "Generated reorder 45 — with history"
  },
  {
    "id": "X053",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "buy again"
        }
      ],
      "cart": [],
      "lastOrder": {
        "orderRef": "KP-GEN-X056",
        "placedAt": 1782895717385,
        "label": "Amma's birthday cake",
        "items": [
          {
            "product": {
              "id": "CAKE-SAMPLE-001",
              "name": "Chocolate Fudge Birthday Cake",
              "price": 4500,
              "currency": "LKR",
              "image": "https://static2.kapruka.com/product-image/width=330,quality=93,f=auto/shops/cakes/sample.jpg",
              "category": "Cakes"
            },
            "quantity": 1
          }
        ],
        "recipient": {
          "name": "Amma",
          "phone": "0771234567"
        },
        "delivery": {
          "city": "Kandy",
          "address": "12 Galle Road, Colombo 03",
          "date": "2026-07-15"
        },
        "giftMessage": "Happy birthday Amma!",
        "senderName": "Ovindu"
      }
    },
    "checks": [
      "reorderOpensCheckout",
      "checkoutPrefill",
      "noToolLeak"
    ],
    "note": "Generated reorder 46 — with history"
  },
  {
    "id": "X054",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "same as last"
        }
      ],
      "cart": []
    },
    "checks": [
      [
        "text",
        "order|previous|first|KP-|last"
      ],
      "noToolLeak"
    ],
    "note": "Generated reorder 47 — no history"
  },
  {
    "id": "X055",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "repeat my last order"
        }
      ],
      "cart": [],
      "lastOrder": {
        "orderRef": "KP-GEN-X058",
        "placedAt": 1782895717385,
        "label": "Amma's birthday cake",
        "items": [
          {
            "product": {
              "id": "CAKE-SAMPLE-001",
              "name": "Chocolate Fudge Birthday Cake",
              "price": 4500,
              "currency": "LKR",
              "image": "https://static2.kapruka.com/product-image/width=330,quality=93,f=auto/shops/cakes/sample.jpg",
              "category": "Cakes"
            },
            "quantity": 1
          }
        ],
        "recipient": {
          "name": "Amma",
          "phone": "0771234567"
        },
        "delivery": {
          "city": "Colombo",
          "address": "12 Galle Road, Colombo 03",
          "date": "2026-07-15"
        },
        "giftMessage": "Happy birthday Amma!",
        "senderName": "Ovindu"
      }
    },
    "checks": [
      "reorderOpensCheckout",
      "checkoutPrefill",
      "noToolLeak"
    ],
    "note": "Generated reorder 48 — with history"
  },
  {
    "id": "X056",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "reorder please"
        }
      ],
      "cart": [],
      "lastOrder": {
        "orderRef": "KP-GEN-X059",
        "placedAt": 1782895717385,
        "label": "Amma's birthday cake",
        "items": [
          {
            "product": {
              "id": "CAKE-SAMPLE-001",
              "name": "Chocolate Fudge Birthday Cake",
              "price": 4500,
              "currency": "LKR",
              "image": "https://static2.kapruka.com/product-image/width=330,quality=93,f=auto/shops/cakes/sample.jpg",
              "category": "Cakes"
            },
            "quantity": 1
          }
        ],
        "recipient": {
          "name": "Amma",
          "phone": "0771234567"
        },
        "delivery": {
          "city": "Kandy",
          "address": "12 Galle Road, Colombo 03",
          "date": "2026-07-15"
        },
        "giftMessage": "Happy birthday Amma!",
        "senderName": "Ovindu"
      }
    },
    "checks": [
      "reorderOpensCheckout",
      "checkoutPrefill",
      "noToolLeak"
    ],
    "note": "Generated reorder 49 — with history"
  },
  {
    "id": "X057",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "order again"
        }
      ],
      "cart": [],
      "lastOrder": {
        "orderRef": "KP-GEN-X060",
        "placedAt": 1782895717385,
        "label": "Amma's birthday cake",
        "items": [
          {
            "product": {
              "id": "CAKE-SAMPLE-001",
              "name": "Chocolate Fudge Birthday Cake",
              "price": 4500,
              "currency": "LKR",
              "image": "https://static2.kapruka.com/product-image/width=330,quality=93,f=auto/shops/cakes/sample.jpg",
              "category": "Cakes"
            },
            "quantity": 1
          }
        ],
        "recipient": {
          "name": "Amma",
          "phone": "0771234567"
        },
        "delivery": {
          "city": "Galle",
          "address": "12 Galle Road, Colombo 03",
          "date": "2026-07-15"
        },
        "giftMessage": "Happy birthday Amma!",
        "senderName": "Ovindu"
      }
    },
    "checks": [
      "reorderOpensCheckout",
      "checkoutPrefill",
      "noToolLeak"
    ],
    "note": "Generated reorder 50 — with history"
  },
  {
    "id": "X058",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "buy again"
        }
      ],
      "cart": []
    },
    "checks": [
      [
        "text",
        "order|previous|first|KP-|last"
      ],
      "noToolLeak"
    ],
    "note": "Generated reorder 51 — no history"
  },
  {
    "id": "X059",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "same as last"
        }
      ],
      "cart": [],
      "lastOrder": {
        "orderRef": "KP-GEN-X062",
        "placedAt": 1782895717385,
        "label": "Amma's birthday cake",
        "items": [
          {
            "product": {
              "id": "CAKE-SAMPLE-001",
              "name": "Chocolate Fudge Birthday Cake",
              "price": 4500,
              "currency": "LKR",
              "image": "https://static2.kapruka.com/product-image/width=330,quality=93,f=auto/shops/cakes/sample.jpg",
              "category": "Cakes"
            },
            "quantity": 1
          }
        ],
        "recipient": {
          "name": "Amma",
          "phone": "0771234567"
        },
        "delivery": {
          "city": "Kandy",
          "address": "12 Galle Road, Colombo 03",
          "date": "2026-07-15"
        },
        "giftMessage": "Happy birthday Amma!",
        "senderName": "Ovindu"
      }
    },
    "checks": [
      "reorderOpensCheckout",
      "checkoutPrefill",
      "noToolLeak"
    ],
    "note": "Generated reorder 52 — with history"
  },
  {
    "id": "X060",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "repeat my last order"
        }
      ],
      "cart": [],
      "lastOrder": {
        "orderRef": "KP-GEN-X063",
        "placedAt": 1782895717385,
        "label": "Amma's birthday cake",
        "items": [
          {
            "product": {
              "id": "CAKE-SAMPLE-001",
              "name": "Chocolate Fudge Birthday Cake",
              "price": 4500,
              "currency": "LKR",
              "image": "https://static2.kapruka.com/product-image/width=330,quality=93,f=auto/shops/cakes/sample.jpg",
              "category": "Cakes"
            },
            "quantity": 1
          }
        ],
        "recipient": {
          "name": "Amma",
          "phone": "0771234567"
        },
        "delivery": {
          "city": "Galle",
          "address": "12 Galle Road, Colombo 03",
          "date": "2026-07-15"
        },
        "giftMessage": "Happy birthday Amma!",
        "senderName": "Ovindu"
      }
    },
    "checks": [
      "reorderOpensCheckout",
      "checkoutPrefill",
      "noToolLeak"
    ],
    "note": "Generated reorder 53 — with history"
  }
];
export const REORDER_HABIT_COUNT = 60;

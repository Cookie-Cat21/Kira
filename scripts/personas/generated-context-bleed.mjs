/** AUTO-GENERATED — node scripts/generate-context-bleed.mjs */
export const GROUP_U = [
  {
    "id": "U001",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "show me flowers on Kapruka"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me chocolates on Kapruka"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "flowers → chocolates switch"
  },
  {
    "id": "U002",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "show me flowers on Kapruka"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me chocolates on Kapruka to Colombo"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "flowers → chocolates switch + city"
  },
  {
    "id": "U003",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "show me chocolates on Kapruka"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me flowers on Kapruka"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "chocolates → flowers switch"
  },
  {
    "id": "U004",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "show me chocolates on Kapruka"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me flowers on Kapruka to Colombo"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "chocolates → flowers switch + city"
  },
  {
    "id": "U005",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "show me cakes on Kapruka"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me flowers on Kapruka"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "cakes → flowers switch"
  },
  {
    "id": "U006",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "show me cakes on Kapruka"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me flowers on Kapruka to Colombo"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "cakes → flowers switch + city"
  },
  {
    "id": "U007",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "show me flowers on Kapruka"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me cakes on Kapruka"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "flowers → cakes switch"
  },
  {
    "id": "U008",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "show me flowers on Kapruka"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me cakes on Kapruka to Colombo"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "flowers → cakes switch + city"
  },
  {
    "id": "U009",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "mixed flower bouquets under 3000"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me chocolates under 3000"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "flower budget → chocolate budget"
  },
  {
    "id": "U010",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "mixed flower bouquets under 3000"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me chocolates under 3000 to Colombo"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "flower budget → chocolate budget + city"
  },
  {
    "id": "U011",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "show me gift hampers on Kapruka"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me flowers on Kapruka"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "hampers → flowers"
  },
  {
    "id": "U012",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "show me gift hampers on Kapruka"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me flowers on Kapruka to Colombo"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "hampers → flowers + city"
  },
  {
    "id": "U013",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "show me roses for anniversary"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me chocolates for anniversary"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "roses → chocolates occasion"
  },
  {
    "id": "U014",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "show me roses for anniversary"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me chocolates for anniversary to Colombo"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "roses → chocolates occasion + city"
  },
  {
    "id": "U015",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "birthday cake under 2000"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "chocolates under 2000"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "cake budget → chocolate budget"
  },
  {
    "id": "U016",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "birthday cake under 2000"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "chocolates under 2000 to Colombo"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "cake budget → chocolate budget + city"
  },
  {
    "id": "U017",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "mixed flower bouquets under 3000 for anniversary"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "Show me options under LKR 3,000"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "Vague options after flowers — stay in flowers"
  },
  {
    "id": "U018",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "show me chocolates on Kapruka"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "Show me options under LKR 3,000"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "Vague options after chocolates"
  },
  {
    "id": "U019",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "show me flowers on Kapruka"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "more options"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "More after flowers"
  },
  {
    "id": "U020",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "show me chocolates on Kapruka"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "more options"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "More after chocolates"
  },
  {
    "id": "U021",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "show me flowers on Kapruka"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me chocolates under 2000"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "Fill switch 0"
  },
  {
    "id": "U022",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "show me chocolates on Kapruka"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me flowers under 3000"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "Fill switch 1"
  },
  {
    "id": "U023",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "show me cakes on Kapruka"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me flowers under 4000"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "Fill switch 2"
  },
  {
    "id": "U024",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "show me flowers on Kapruka"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me cakes under 5000"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "Fill switch 3"
  },
  {
    "id": "U025",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "mixed flower bouquets under 3000"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me chocolates under 2000"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "Fill switch 4"
  },
  {
    "id": "U026",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "show me gift hampers on Kapruka"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me flowers under 3000"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "Fill switch 5"
  },
  {
    "id": "U027",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "show me roses for anniversary"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me chocolates for anniversary"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "Fill switch 6"
  },
  {
    "id": "U028",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "birthday cake under 2000"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "chocolates under 2000"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "Fill switch 7"
  },
  {
    "id": "U029",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "show me flowers on Kapruka"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me chocolates under 2000"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "Fill switch 8"
  },
  {
    "id": "U030",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "show me chocolates on Kapruka"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me flowers under 3000"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "Fill switch 9"
  },
  {
    "id": "U031",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "show me cakes on Kapruka"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me flowers under 4000"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "Fill switch 10"
  },
  {
    "id": "U032",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "show me flowers on Kapruka"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me cakes under 5000"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "Fill switch 11"
  },
  {
    "id": "U033",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "mixed flower bouquets under 3000"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me chocolates under 2000"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "Fill switch 12"
  },
  {
    "id": "U034",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "show me gift hampers on Kapruka"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me flowers under 3000"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "Fill switch 13"
  },
  {
    "id": "U035",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "show me roses for anniversary"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me chocolates for anniversary"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "Fill switch 14"
  },
  {
    "id": "U036",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "birthday cake under 2000"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "chocolates under 2000"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "Fill switch 15"
  },
  {
    "id": "U037",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "show me flowers on Kapruka"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me chocolates under 2000"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "Fill switch 16"
  },
  {
    "id": "U038",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "show me chocolates on Kapruka"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me flowers under 3000"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "Fill switch 17"
  },
  {
    "id": "U039",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "show me cakes on Kapruka"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me flowers under 4000"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "Fill switch 18"
  },
  {
    "id": "U040",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "show me flowers on Kapruka"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me cakes under 5000"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "Fill switch 19"
  },
  {
    "id": "U041",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "mixed flower bouquets under 3000"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me chocolates under 2000"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "Fill switch 20"
  },
  {
    "id": "U042",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "show me gift hampers on Kapruka"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me flowers under 3000"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "Fill switch 21"
  },
  {
    "id": "U043",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "show me roses for anniversary"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me chocolates for anniversary"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "Fill switch 22"
  },
  {
    "id": "U044",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "birthday cake under 2000"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "chocolates under 2000"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "Fill switch 23"
  },
  {
    "id": "U045",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "show me flowers on Kapruka"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me chocolates under 2000"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "Fill switch 24"
  },
  {
    "id": "U046",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "show me chocolates on Kapruka"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me flowers under 3000"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "Fill switch 25"
  },
  {
    "id": "U047",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "show me cakes on Kapruka"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me flowers under 4000"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "Fill switch 26"
  },
  {
    "id": "U048",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "show me flowers on Kapruka"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me cakes under 5000"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "Fill switch 27"
  },
  {
    "id": "U049",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "mixed flower bouquets under 3000"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me chocolates under 2000"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "Fill switch 28"
  },
  {
    "id": "U050",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "show me gift hampers on Kapruka"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me flowers under 3000"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "Fill switch 29"
  },
  {
    "id": "U051",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "show me roses for anniversary"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me chocolates for anniversary"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "Fill switch 30"
  },
  {
    "id": "U052",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "birthday cake under 2000"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "chocolates under 2000"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "Fill switch 31"
  },
  {
    "id": "U053",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "show me flowers on Kapruka"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me chocolates under 2000"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "Fill switch 32"
  },
  {
    "id": "U054",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "show me chocolates on Kapruka"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me flowers under 3000"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "Fill switch 33"
  },
  {
    "id": "U055",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "show me cakes on Kapruka"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me flowers under 4000"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "Fill switch 34"
  },
  {
    "id": "U056",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "show me flowers on Kapruka"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me cakes under 5000"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "Fill switch 35"
  },
  {
    "id": "U057",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "mixed flower bouquets under 3000"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me chocolates under 2000"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "Fill switch 36"
  },
  {
    "id": "U058",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "show me gift hampers on Kapruka"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me flowers under 3000"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "Fill switch 37"
  },
  {
    "id": "U059",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "show me roses for anniversary"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me chocolates for anniversary"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "Fill switch 38"
  },
  {
    "id": "U060",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "birthday cake under 2000"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "chocolates under 2000"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "Fill switch 39"
  },
  {
    "id": "U061",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "show me flowers on Kapruka"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me chocolates under 2000"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "Fill switch 40"
  },
  {
    "id": "U062",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "show me chocolates on Kapruka"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me flowers under 3000"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "Fill switch 41"
  },
  {
    "id": "U063",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "show me cakes on Kapruka"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me flowers under 4000"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "Fill switch 42"
  },
  {
    "id": "U064",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "show me flowers on Kapruka"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me cakes under 5000"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "Fill switch 43"
  },
  {
    "id": "U065",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "mixed flower bouquets under 3000"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me chocolates under 2000"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "Fill switch 44"
  },
  {
    "id": "U066",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "show me gift hampers on Kapruka"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me flowers under 3000"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "Fill switch 45"
  },
  {
    "id": "U067",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "show me roses for anniversary"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me chocolates for anniversary"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "Fill switch 46"
  },
  {
    "id": "U068",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "birthday cake under 2000"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "chocolates under 2000"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "Fill switch 47"
  },
  {
    "id": "U069",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "show me flowers on Kapruka"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me chocolates under 2000"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "Fill switch 48"
  },
  {
    "id": "U070",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "show me chocolates on Kapruka"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me flowers under 3000"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "Fill switch 49"
  },
  {
    "id": "U071",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "show me cakes on Kapruka"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me flowers under 4000"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "Fill switch 50"
  },
  {
    "id": "U072",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "show me flowers on Kapruka"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me cakes under 5000"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "Fill switch 51"
  },
  {
    "id": "U073",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "mixed flower bouquets under 3000"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me chocolates under 2000"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "Fill switch 52"
  },
  {
    "id": "U074",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "show me gift hampers on Kapruka"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me flowers under 3000"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "Fill switch 53"
  },
  {
    "id": "U075",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "show me roses for anniversary"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me chocolates for anniversary"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "Fill switch 54"
  },
  {
    "id": "U076",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "birthday cake under 2000"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "chocolates under 2000"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "Fill switch 55"
  },
  {
    "id": "U077",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "show me flowers on Kapruka"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me chocolates under 2000"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "Fill switch 56"
  },
  {
    "id": "U078",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "show me chocolates on Kapruka"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me flowers under 3000"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "Fill switch 57"
  },
  {
    "id": "U079",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "show me cakes on Kapruka"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me flowers under 4000"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "Fill switch 58"
  },
  {
    "id": "U080",
    "request": {
      "messages": [
        {
          "role": "user",
          "content": "show me flowers on Kapruka"
        },
        {
          "role": "assistant",
          "content": "Here are some picks from Kapruka!"
        },
        {
          "role": "user",
          "content": "show me cakes under 5000"
        }
      ]
    },
    "checks": [
      "productsOrHonestEmpty",
      "noContextBleed",
      "searchRelevance",
      "noFamilyUnsafe",
      "noToolLeak"
    ],
    "note": "Fill switch 59"
  }
];
export const CONTEXT_BLEED_COUNT = 80;

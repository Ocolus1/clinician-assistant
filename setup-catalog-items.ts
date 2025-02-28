import { db } from "./server/db";
import { budgetItemCatalog } from "./shared/schema";

async function createCatalogItems() {
  // Sample catalog items
  const items = [
    {
      itemCode: "THERAPY-001",
      description: "Individual Speech Therapy Session (1 hour)",
      defaultUnitPrice: 150,
      category: "Therapy",
      isActive: true
    },
    {
      itemCode: "THERAPY-002",
      description: "Group Speech Therapy Session (1 hour)",
      defaultUnitPrice: 75,
      category: "Therapy",
      isActive: true
    },
    {
      itemCode: "THERAPY-003",
      description: "Intensive Speech Therapy Program (10 sessions)",
      defaultUnitPrice: 1300,
      category: "Therapy",
      isActive: true
    },
    {
      itemCode: "ASSESS-001",
      description: "Initial Speech Assessment",
      defaultUnitPrice: 250,
      category: "Assessment",
      isActive: true
    },
    {
      itemCode: "ASSESS-002",
      description: "Comprehensive Language Evaluation",
      defaultUnitPrice: 350,
      category: "Assessment",
      isActive: true
    },
    {
      itemCode: "MATER-001",
      description: "Speech Therapy Workbook",
      defaultUnitPrice: 45,
      category: "Materials",
      isActive: true
    },
    {
      itemCode: "MATER-002",
      description: "Articulation Cards Set",
      defaultUnitPrice: 35,
      category: "Materials",
      isActive: true
    },
    {
      itemCode: "EQUIP-001",
      description: "Speech Therapy Equipment Kit",
      defaultUnitPrice: 120,
      category: "Equipment",
      isActive: true
    },
    {
      itemCode: "EQUIP-002",
      description: "Digital Speech Analysis Software (1 year license)",
      defaultUnitPrice: 200,
      category: "Equipment",
      isActive: true
    },
    {
      itemCode: "ADMIN-001",
      description: "Administrative Fee",
      defaultUnitPrice: 25,
      category: "Administrative",
      isActive: true
    }
  ];

  console.log("Creating catalog items...");

  // First, check if items already exist to avoid duplicates
  const existingItems = await db.select().from(budgetItemCatalog);
  
  if (existingItems.length > 0) {
    console.log(`${existingItems.length} catalog items already exist. Skipping creation.`);
    return;
  }

  // Insert items
  try {
    for (const item of items) {
      await db.insert(budgetItemCatalog).values(item);
    }
    console.log(`Successfully created ${items.length} catalog items.`);
  } catch (error) {
    console.error("Error creating catalog items:", error);
  }
}

// Run the function
createCatalogItems()
  .then(() => {
    console.log("Catalog setup complete");
    process.exit(0);
  })
  .catch(error => {
    console.error("Error during catalog setup:", error);
    process.exit(1);
  });
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client.js";

const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

prisma
	.$connect()
	.then(async () => {
		console.log("Connected to the database successfully.");
		await prisma.$disconnect();
	})
	.catch(async (error) => {
		console.error("Error connecting to the database:", error);
		await prisma.$disconnect();
		process.exit(1);
	});

export { prisma };

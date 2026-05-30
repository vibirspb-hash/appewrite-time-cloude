import { Client, Databases, ID, Query } from "appwrite";

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

const client = new Client()
  .setEndpoint(endpoint || "https://cloud.appwrite.io/v1")
  .setProject(projectId || "missing-project-id");

export const databases = new Databases(client);
export { ID, Query };

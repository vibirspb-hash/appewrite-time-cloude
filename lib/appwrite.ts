import { Client, ID, Query, TablesDB } from "appwrite";

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

const client = new Client()
  .setEndpoint(endpoint || "https://cloud.appwrite.io/v1")
  .setProject(projectId || "missing-project-id");

export const tablesDB = new TablesDB(client);
export { ID, Query };

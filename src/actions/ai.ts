"use server"

import { generateText } from "ai"
import { createAzure } from "@ai-sdk/azure"
import { auth } from "@/auth"

export async function generateTaskDescription(title: string) {
  const session = await auth()
  if (!session?.user) throw new Error("Unauthorized")

  if (!process.env.AZURE_OPENAI_API_KEY) {
    throw new Error("Missing Azure OpenAI configuration. Please add AZURE_OPENAI_API_KEY, AZURE_OPENAI_ENDPOINT, etc.")
  }

  const endpoint = process.env.AZURE_OPENAI_ENDPOINT || ""
  // Extract resource name from https://<resource-name>.cognitiveservices.azure.com
  let resourceName = process.env.AZURE_RESOURCE_NAME
  if (!resourceName && endpoint) {
    const match = endpoint.match(/https:\/\/([^.]+)\.cognitiveservices\.azure\.com/i)
    if (match && match[1]) {
      resourceName = match[1]
    }
  }

  if (!resourceName) {
    throw new Error("Could not determine Azure resource name from endpoint.")
  }

  const azure = createAzure({
    resourceName,
    apiKey: process.env.AZURE_OPENAI_API_KEY,
  })

  const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt5.4min"

  const { text } = await generateText({
    // @ts-ignore
    model: azure(deploymentName),
    system: "You are a senior technical product manager. Your job is to take a short task title and expand it into a well-structured, concise markdown description. Use sections like: **Overview**, **Expected Behavior**, and **Acceptance Criteria**. Keep it brief, action-oriented, and realistic.",
    prompt: `Task Title: ${title}`,
  })

  return text
}

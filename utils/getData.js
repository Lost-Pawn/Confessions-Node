import path from 'node:path'
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const __dirname = import.meta.dirname || path.dirname(fileURLToPath(import.meta.url))

// Retrives data from data/data.json
export async function getData() {
    try {
        const pathJSON = path.join(__dirname, '..', 'data', 'data.json')
        const data = await fs.readFile(pathJSON, 'utf8')
        const parsedData = JSON.parse(data)
        return parsedData
    } catch (err) {
        return []
    }
}
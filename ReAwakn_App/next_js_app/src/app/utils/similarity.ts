/**
 * Utility functions for calculating similarity between embeddings
 */

/**
 * Converts a JSONB embedding object to an array
 * @param jsonbEmbedding - The JSONB embedding object (e.g., {"0": 110, "1": 115, ...})
 * @returns An array of numbers representing the embedding
 */
export function jsonbToArray(jsonbEmbedding: Record<string, number>): number[] {
  // Get the length of the embedding
  const length = Object.keys(jsonbEmbedding).length;

  // Create an array of the correct length
  const array = new Array(length);

  // Fill the array with values from the JSONB object
  for (let i = 0; i < length; i++) {
    array[i] = jsonbEmbedding[i.toString()];
  }

  return array;
}

/**
 * Calculates the dot product of two vectors
 * @param a - First vector
 * @param b - Second vector
 * @returns The dot product of the two vectors
 */
export function dotProduct(a: number[], b: number[]): number {
  // Ensure vectors are of the same length
  if (a.length !== b.length) {
    throw new Error("Vectors must be of the same length");
  }

  // Calculate dot product
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }

  return sum;
}

/**
 * Calculates the magnitude (Euclidean norm) of a vector
 * @param vector - The vector
 * @returns The magnitude of the vector
 */
export function magnitude(vector: number[]): number {
  let sum = 0;
  for (let i = 0; i < vector.length; i++) {
    sum += vector[i] * vector[i];
  }

  return Math.sqrt(sum);
}

/**
 * Calculates the cosine similarity between two vectors
 * @param a - First vector
 * @param b - Second vector
 * @returns The cosine similarity (between -1 and 1)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  const dot = dotProduct(a, b);
  const magA = magnitude(a);
  const magB = magnitude(b);

  // Avoid division by zero
  if (magA === 0 || magB === 0) {
    return 0;
  }

  return dot / (magA * magB);
}

/**
 * Calculates the cosine similarity between two JSONB embeddings
 * @param embedding1 - First JSONB embedding
 * @param embedding2 - Second JSONB embedding
 * @returns The cosine similarity (between -1 and 1)
 */
export function calculateEmbeddingSimilarity(
  embedding1: Record<string, number>,
  embedding2: Record<string, number>
): number {
  const array1 = jsonbToArray(embedding1);
  const array2 = jsonbToArray(embedding2);

  return cosineSimilarity(array1, array2);
}

/**
 * Determines if a teaching skill is compatible with a learning skill based on embedding similarity
 * @param teachingSkillEmbedding - The embedding of the teaching skill
 * @param learningSkillEmbedding - The embedding of the learning skill
 * @param threshold - The similarity threshold (default: 0.8)
 * @returns True if the skills are similar enough for teaching/learning
 */
export function isGoodTeachingMatch(
  teachingSkillEmbedding: Record<string, number>,
  learningSkillEmbedding: Record<string, number>,
  threshold: number = 0.8
): boolean {
  const similarity = calculateEmbeddingSimilarity(
    teachingSkillEmbedding,
    learningSkillEmbedding
  );
  return similarity >= threshold;
}

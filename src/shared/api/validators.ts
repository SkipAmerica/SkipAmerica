// API boundary validation utilities
import { z } from 'zod'
import { APIError } from './errors'

/**
 * Validates input data against a Zod schema
 * @param schema Zod schema to validate against
 * @param data Data to validate
 * @throws APIError if validation fails
 */
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data)
  
  if (!result.success) {
    const errorMessage = result.error.issues
      .map(err => `${err.path.join('.')}: ${err.message}`)
      .join(', ')
    
    throw new APIError(
      `Validation failed: ${errorMessage}`,
      'VALIDATION_ERROR',
      { errors: result.error.issues }
    )
  }
  
  return result.data
}

/**
 * Validates API response data against a Zod schema
 * @param schema Zod schema to validate against  
 * @param data Response data to validate
 * @throws APIError if validation fails
 */
export function validateResponse<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data)
  
  if (!result.success) {
    console.error('API Response validation failed:', result.error.issues)
    throw new APIError(
      'Invalid response from server',
      'RESPONSE_VALIDATION_ERROR',
      { errors: result.error.issues }
    )
  }
  
  return result.data
}

/**
 * Creates a validated query function for React Query
 */
export function createValidatedQuery<TInput, TOutput>(
  queryFn: (input: TInput) => Promise<unknown>,
  inputSchema: z.ZodSchema<TInput>,
  outputSchema: z.ZodSchema<TOutput>
) {
  return async (input: unknown): Promise<TOutput> => {
    const validatedInput = validateInput(inputSchema, input)
    const response = await queryFn(validatedInput)
    return validateResponse(outputSchema, response)
  }
}

/**
 * Creates a validated mutation function for React Query
 */
export function createValidatedMutation<TInput, TOutput>(
  mutationFn: (input: TInput) => Promise<unknown>,
  inputSchema: z.ZodSchema<TInput>,
  outputSchema: z.ZodSchema<TOutput>
) {
  return async (input: unknown): Promise<TOutput> => {
    const validatedInput = validateInput(inputSchema, input)
    const response = await mutationFn(validatedInput)
    return validateResponse(outputSchema, response)
  }
}
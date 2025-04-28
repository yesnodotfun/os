import { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';

// Defining the schema for the request
const EncodeRequestSchema = z.object({
  url: z.string().url().or(z.string().min(1)),
  year: z.string().default("current"),
});

const DecodeRequestSchema = z.object({
  code: z.string().min(1),
});

// A simple encoding/decoding function that uses Base64
function encodeData(url: string, year: string): string {
  const data = JSON.stringify({ url, year });
  return Buffer.from(data).toString('base64');
}

function decodeData(code: string): { url: string; year: string } | null {
  try {
    const decoded = Buffer.from(code, 'base64').toString();
    const data = JSON.parse(decoded);
    return { url: data.url, year: data.year };
  } catch (error) {
    return null;
  }
}

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  try {
    // Handle encode requests
    if (request.method === 'POST' && request.query.action === 'encode') {
      const result = EncodeRequestSchema.safeParse(request.body);
      
      if (!result.success) {
        return response.status(400).json({
          error: true,
          message: 'Invalid request data',
          details: result.error.format(),
        });
      }

      const { url, year } = result.data;
      const code = encodeData(url, year);
      
      return response.status(200).json({
        code,
        shareUrl: `${process.env.VERCEL_URL || 'https://os.ryo.lu'}/share/${code}`,
      });
    }
    
    // Handle decode requests
    if (request.method === 'GET' && request.query.action === 'decode') {
      const result = DecodeRequestSchema.safeParse(request.query);
      
      if (!result.success) {
        return response.status(400).json({
          error: true,
          message: 'Invalid code',
          details: result.error.format(),
        });
      }

      const decoded = decodeData(result.data.code);
      
      if (!decoded) {
        return response.status(400).json({
          error: true,
          message: 'Could not decode the provided code',
        });
      }
      
      return response.status(200).json(decoded);
    }

    // If no valid action is specified
    return response.status(400).json({
      error: true,
      message: 'Invalid action. Use "encode" or "decode"',
    });
  } catch (error) {
    console.error('Share link API error:', error);
    return response.status(500).json({
      error: true,
      message: 'Internal server error',
    });
  }
} 
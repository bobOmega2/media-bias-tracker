/**
 * API Route: /api/ai_analyze
 * Analyzes article content for bias using Gemini 2.5 Pro
 */

import { GoogleGenAI } from '@google/genai'
import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'


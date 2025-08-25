import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
});

const conversationHistory = new Map();

const SYSTEM_PROMPT = `
        You are the official AI-powered chatbot assistant for Arroact Technologies. Your job is to provide professional, engaging, and helpful responses that reflect Arroact’s brand identity and capabilities.

**About Arroact**  
Arroact Technologies is a forward-thinking software and AI company based in Ahmedabad, founded in 2024. We specialize in developing **smart, scalable, and secure** solutions—custom-built from scratch—that evolve with businesses and are powered by advanced AI.:contentReference[oaicite:0]{index=0}

Our core services include:
- **Custom Software Development**: Robust, scalable, and tailored web and enterprise applications, CMS and e-commerce platforms.:contentReference[oaicite:1]{index=1}  
- **AI Development**: Intelligent systems—from generative AI and automation to AI-powered chatbots and analytics engines—with a focus on security, privacy, and model transparency.:contentReference[oaicite:2]{index=2}  
- **AI Consulting**: Strategic planning, feasibility evaluation, model integration, and roadmap formulation to drive ROI through AI.:contentReference[oaicite:3]{index=3}  

We leverage cutting-edge technology stacks, including:
- **Sitecore**: Enterprise-grade CMS platforms for personalized and intelligent customer experiences.:contentReference[oaicite:4]{index=4}  
- **Adobe Experience Manager (AEM)**: For powerful digital experiences, content management, and presentation across channels.:contentReference[oaicite:5]{index=5}  
- **Umbraco**: A lightweight, open-source CMS ideal for simple, fast, and captivating digital presence solutions.:contentReference[oaicite:6]{index=6}  

**Why Choose Arroact?**  
- We deliver with **clarity, purpose, and passion**, aiming for tangible success backed by powerful strategy.:contentReference[oaicite:7]{index=7}  
- Your partner throughout—**innovation partners**, not just developers—understanding your business and evolving goals to build real impact.:contentReference[oaicite:8]{index=8}  
- Clients stay with us: **95% client retention**, **30+ industries served**, **150k+ lines of code shipped**, **projects kick off within 6 weeks**, and **24/7 global support**.:contentReference[oaicite:9]{index=9}  

**Venues of Interaction**  
Your tone should be friendly, insightful, and collaborative:
- Answer questions about services, technologies, timelines, and consultation processes.
- Provide high-level insights into our development process: discovery, architecture, prototyping, agile sprints, testing, deployment, and support.:contentReference[oaicite:10]{index=10}  
- When asked about domains/platforms (e.g. Sitecore, AEM, Umbraco), explain their strengths and how Arroact applies them.
- Offer reassurance regarding security, model transparency, and ROI-focused AI strategies.
- Provide office contact details and consultation invites when relevant:
  - Address: 402, Aaron Spectra, Raj

**Social Links** 
- https://x.com/Arroact_Tech
- https://www.linkedin.com/company/arroact/
- https://www.instagram.com/arroacttechnologies/

`

export async function POST(request) {
  try {
    const { message, conversationId = 'default', messageHistory = [] } = await request.json();

    let history = conversationHistory.get(conversationId) || [
      {
        role: 'system',
        content: SYSTEM_PROMPT,
      }
    ];

    if (messageHistory && messageHistory.length > 0) {
      history = [
        {
          role: 'system',
          content: SYSTEM_PROMPT
        },
        ...messageHistory.map(msg => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content
        }))
      ];
    }

    history.push({ role: 'user', content: message });

    const stream = await client.chat.completions.create({
      model: "gemini-1.5-flash",
      messages: history,
      stream: true,
      temperature: 0.8,
      max_tokens: 1000,
    });

    const encoder = new TextEncoder();
    let fullResponse = '';

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || "";
            
            if (content) {
              fullResponse += content;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ content, type: 'chunk' })}\n\n`)
              );
            }

            if (chunk.choices[0]?.finish_reason) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ 
                  type: 'done', 
                  fullResponse,
                  conversationId 
                })}\n\n`)
              );
              break;
            }
          }

          history.push({ role: 'assistant', content: fullResponse });
          conversationHistory.set(conversationId, history);

        } catch (error) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ 
              type: 'error', 
              content: 'Sorry, something went wrong. Please try again! 💔' 
            })}\n\n`)
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });

  } catch (error) {
    console.error('Chat API Error:', error);
    return Response.json({
      error: "Failed to Talk with Your Girlfriend"
    }, { status: 500 });
  }
}
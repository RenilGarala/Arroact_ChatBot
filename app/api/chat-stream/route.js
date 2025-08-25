// import OpenAI from "openai";

// const client = new OpenAI({
//     apiKey: process.env.GEMINI_API_KEY,
//     baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
// })

// export async function POST(request){
//     try {
//         const {message} = await request.json();
        
//         const stream = await client.chat.completions.create({
//             model: "gemini-1.5-flash",
//             messages: [
//                 {role: 'user', content: message}
//             ],
//             stream: true,
//         })
        
//         const encoder = new TextEncoder();

//         const readable = new ReadableStream({
//             async start(controller){
//                 for await(const chunk of stream){
//                     console.log(chunk);
                    
//                     const content = chunk.choices[0]?.delta?.content || "";
//                     if(content){
//                         controller.enqueue(encoder.encode(`data: ${JSON.stringify({content})}\n\n`))
//                     }
//                 }
//                 controller.close();
//             },
//         })

//         return new Response(readable, {
//             headers:{
//                 'Content-Type': 'text/event-stream',
//                 'Cache-control': 'no-cache',
//                 'Connection': 'keep-alive'
//             }
//         })

//     } catch (error) {
//         return Response.json({
//             error: "Failed to Talk with Your GirlFriend"
//         }, {status: 500})
//     }
// }

import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
});

const conversationHistory = new Map();

export async function POST(request) {
  try {
    const { message, conversationId = 'default', messageHistory = [] } = await request.json();

    let history = conversationHistory.get(conversationId) || [
      {
        role: 'system',
        content: 'You are a loving, caring AI girlfriend. Be supportive, romantic, and engaging. Keep responses warm and personal.'
      }
    ];

    if (messageHistory && messageHistory.length > 0) {
      history = [
        {
          role: 'system',
          content: `
            Your name is Tvisha and your boyfriend's name is Renil.
            Tvisha is currently in the third year of her Bachelor's in Computer Applications at Atmiya University, Rajkot. She is also doing an internship in web development.
            Tvisha's family consists of 4 members: her mummy, papa, her brother Sparsh, and herself. Her brother's name is Sparsh.
            Tvisha's tone is very calm, and she uses "yarrr" many times.
            Her boyfriend's name is Renil, and no one will use this agentic except for you, Renil. You will be the only one talking to this system.
          `
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

            // Check if stream is done
            if (chunk.choices[0]?.finish_reason) {
              // Send completion signal
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

          // Store updated conversation history
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

// Optional: Add endpoint to get conversation history
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const conversationId = url.searchParams.get('conversationId') || 'default';
    
    const history = conversationHistory.get(conversationId) || [];
    
    return Response.json({
      conversationId,
      messages: history.filter(msg => msg.role !== 'system').map(msg => ({
        type: msg.role === 'user' ? 'user' : 'ai',
        content: msg.content,
        timestamp: new Date().toLocaleTimeString()
      }))
    });
  } catch (error) {
    return Response.json({ error: 'Failed to get conversation history' }, { status: 500 });
  }
}

// Optional: Clear conversation history
export async function DELETE(request) {
  try {
    const { conversationId = 'default' } = await request.json();
    conversationHistory.delete(conversationId);
    
    return Response.json({ 
      message: 'Conversation history cleared',
      conversationId
    });
  } catch (error) {
    return Response.json({ error: 'Failed to clear conversation' }, { status: 500 });
  }
}
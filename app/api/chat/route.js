import OpenAI from "openai";

const client = new OpenAI({
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
})

export async function POST(request){
    try {
        const {message} = await request.json();
        
        const completion = await client.chat.completions.create({
            model: "gemini-1.5-flash",
            messages: [
                {role: 'user', content: message}
            ]
        })

        console.log(completion);
        
        return Response.json({
            response: completion.choices[0].message.content,
        })
    } catch (error) {
        return Response.json({
            error: "Failed to Talk with Your GirlFriend"
        }, {status: 500})
    }
}
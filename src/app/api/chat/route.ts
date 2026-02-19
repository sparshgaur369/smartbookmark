import { createClient } from "@/lib/supabase/server";

export const maxDuration = 30;

// Define tools as plain OpenAI function calling format
const TOOLS = [
    {
        type: "function" as const,
        function: {
            name: "addBookmark",
            description: "Adds a new bookmark with a title and URL",
            parameters: {
                type: "object",
                properties: {
                    title: { type: "string", description: "The title of the bookmark" },
                    url: { type: "string", description: "The URL of the bookmark" },
                },
                required: ["title", "url"],
            },
        },
    },
    {
        type: "function" as const,
        function: {
            name: "deleteBookmark",
            description: "Deletes a bookmark by its ID",
            parameters: {
                type: "object",
                properties: {
                    id: { type: "string", description: "The ID of the bookmark to delete" },
                },
                required: ["id"],
            },
        },
    },
    {
        type: "function" as const,
        function: {
            name: "listBookmarks",
            description:
                "Lists all bookmarks for the current user. Use this to find a bookmark's ID for deletion or to answer questions about the user's bookmarks.",
            parameters: {
                type: "object",
                properties: {},
            },
        },
    },
];

export async function POST(req: Request) {
    const { messages } = await req.json();
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return new Response("Unauthorized", { status: 401 });
    }

    const systemMessage = {
        role: "system",
        content: `You are a helpful assistant that manages bookmarks. 
You can add, delete, and list bookmarks for the user.
When asking to add a bookmark, if the user provides a name and a url, add it immediately.
If the user asks to delete a bookmark, first find the bookmark by name to get its ID, then delete it.
If the user asks about their bookmarks, list them.
Current user ID: ${user.id}`,
    };

    // Build conversation with system prompt
    let conversation = [systemMessage, ...messages];

    // Loop to handle tool calls (OpenAI may call multiple tools in sequence)
    const MAX_ROUNDS = 5;
    for (let round = 0; round < MAX_ROUNDS; round++) {
        const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: conversation,
                tools: TOOLS,
                tool_choice: "auto",
            }),
        });

        if (!openaiResponse.ok) {
            const errorData = await openaiResponse.text();
            console.error("OpenAI API error:", errorData);
            return Response.json(
                { role: "assistant", content: "Sorry, I encountered an error. Please try again." },
                { status: 500 }
            );
        }

        const data = await openaiResponse.json();
        const choice = data.choices[0];
        const assistantMessage = choice.message;

        // If the model wants to call tools
        if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
            // Add assistant's tool-call message to conversation
            conversation.push(assistantMessage);

            // Execute each tool call
            for (const toolCall of assistantMessage.tool_calls) {
                const args = JSON.parse(toolCall.function.arguments);
                let result: string;

                switch (toolCall.function.name) {
                    case "addBookmark": {
                        const { data: bookmark, error } = await supabase
                            .from("bookmarks")
                            .insert({ title: args.title, url: args.url, user_id: user.id })
                            .select()
                            .single();

                        result = error
                            ? `Failed to add bookmark: ${error.message}`
                            : `Bookmark added: ${bookmark.title} (${bookmark.url})`;
                        break;
                    }
                    case "deleteBookmark": {
                        const { error } = await supabase
                            .from("bookmarks")
                            .delete()
                            .eq("id", args.id)
                            .eq("user_id", user.id);

                        result = error
                            ? `Failed to delete bookmark: ${error.message}`
                            : `Bookmark deleted successfully`;
                        break;
                    }
                    case "listBookmarks": {
                        const { data: bookmarks, error } = await supabase
                            .from("bookmarks")
                            .select("*")
                            .eq("user_id", user.id);

                        if (error) {
                            result = `Failed to list bookmarks: ${error.message}`;
                        } else if (!bookmarks || bookmarks.length === 0) {
                            result = "No bookmarks found.";
                        } else {
                            result = JSON.stringify(bookmarks);
                        }
                        break;
                    }
                    default:
                        result = `Unknown tool: ${toolCall.function.name}`;
                }

                // Add tool result to conversation
                conversation.push({
                    role: "tool",
                    tool_call_id: toolCall.id,
                    content: result,
                });
            }

            // Continue the loop so the model can respond with the tool results
            continue;
        }

        // No tool calls — return the final text response
        return Response.json({
            role: "assistant",
            content: assistantMessage.content || "Done!",
        });
    }

    // Fallback if we hit max rounds
    return Response.json({
        role: "assistant",
        content: "I completed the requested actions.",
    });
}

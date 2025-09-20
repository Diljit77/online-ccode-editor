import { httpRouter } from "convex/server"
import {httpAction} from "./_generated/server"
import { Webhook } from "svix";
import { WebhookEvent } from "@clerk/nextjs/server";
const http=httpRouter();

import {api, internal} from "./_generated/api"
import { request } from "http";
http.route({
    path:"/clerk-webhook",
    method:"POST",
    handler:httpAction(async (ctx,request)=>{
        const webhookSecret=process.env.CLERK_WEBHOOK_SECRET;
        if(!webhookSecret){
            console.error("CLERK_WEBHOOK_SECRET is not set");
            return new Response("CLERK_WEBHOOK_SECRET is not set", {status:500});
        }
        const svix_id=request.headers.get("svix-id");
        const svix_timestamp=request.headers.get("svix-timestamp");
        const svix_signature=request.headers.get("svix-signature");
        
    if(!svix_id || !svix_timestamp || !svix_signature){
        console.error("Missing Svix headers");
        return new Response("Missing Svix headers", {status:400});
    }
    const payload=await request.json();
    const body=JSON.stringify(payload);
    const wh=new Webhook(webhookSecret);
    let evt : WebhookEvent;

try {
    evt=wh.verify(body,{
        "svix-id":svix_id,
        "svix-signature":svix_signature,
        "svix-timestamp":svix_timestamp
    }) as WebhookEvent;
} catch (error) {
    console.log("Error Verifying webhook",error);
    return new Response("Error occured ",{status:400})
}
const eventType=evt.type;
if(eventType==="user.created"){
    // save the user to convex 
    const {id,email_addresses,  first_name,last_name}=evt.data;
    const email=email_addresses[0].email_address;
    const name=`${first_name || ""} ${last_name|| ""}`.trim();
    try {
       await ctx.runMutation(api.user.syncUser,{userId:id,email,name})
    } catch (error) {
        console.log(error)
        return new Response("Error creating user",{status:500})
    }
}
return new Response("WebHook processed successfully",{status:200});
    })
})
http.route({
    path:"/lemon-squeezy-webhook",
    method:"POST",
    handler:httpAction(async (ctx ,request)=>{
        const payloadString=await request.text();
        const signature=request.headers.get("X-Signature");
        if(!signature){
            return new Response("Missing X-signature header ",{status:400})
        }
        try {
            const payload = await ctx.runAction(internal.lemonSqueezy.verifywebhook, {
        payload: payloadString,
        signature,
      });

      if (payload.meta.event_name === "order_created") {
        const { data } = payload;

        const { success } = await ctx.runMutation(api.user.upgradeToPro, {
          email: data.attributes.user_email,
          lemonSqueezyCustomerId: data.attributes.customer_id.toString(),
          lemonSqueezyOrderId: data.id,
          amount: data.attributes.total,
        });

      }

     

        } catch (error) {
                console.log("Error creating user:", error);
        return new Response("Error creating user", { status: 500 });
        }
        
   
    return new Response("Webhook processed successfully", { status: 200 });




    }
)




})

export default http;
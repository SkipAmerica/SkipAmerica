// SMS notification templates for queue position updates
export const NOTIFICATION_TEMPLATES = {
  QUEUE_P1_GO_TIME: {
    push: {
      title: "It's your turn!",
      body: "{creatorName} is ready. Join now!",
      action: "JOIN",
      url: "/session/{sessionId}?role=user"
    },
    sms: "🔴 {creatorName} is ready for you! Join now: {joinLink}\n\n⏱️ This invite expires in 5 minutes."
  }
};

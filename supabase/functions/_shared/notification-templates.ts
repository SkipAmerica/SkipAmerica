export const NOTIFICATION_TEMPLATES = {
  QUEUE_P2_HEADS_UP: {
    push: {
      title: "Almost your turn!",
      body: "You're #2 in line. ETA ~{eta} min."
    },
    sms: "You're almost up in {creatorName}'s queue! ETA ~{eta} min. Reply READY when you're set, or SNOOZE to step back."
  },
  QUEUE_P1_GO_TIME: {
    push: {
      title: "It's your turn!",
      body: "{creatorName} is ready. Join now!",
      action: "JOIN",
      url: "/session/{sessionId}?role=user"
    },
    sms: "🔴 {creatorName} is ready for you! Join: {joinLink}\nReply HOLD to wait 60s, PASS to skip."
  },
  QUEUE_P1_REMINDER: {
    sms: "⏱️ Still there? {creatorName} is waiting. Join now: {joinLink} or reply PASS."
  },
  QUEUE_P1_VOICE_IVR: {
    voice: "Hi, this is Skip. {creatorName} is ready for your call. Press 1 to join, 2 to hold for 60 seconds, or 9 to skip."
  }
} as const

export type NotificationTemplate = keyof typeof NOTIFICATION_TEMPLATES

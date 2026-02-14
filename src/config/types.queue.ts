export type QueueMode =
  | "steer"
  | "followup"
  | "collect"
  | "steer-backlog"
  | "steer+backlog"
  | "queue"
  | "interrupt";
export type QueueDropPolicy = "old" | "new" | "summarize";

export type QueueModeByProvider = {
  slack?: QueueMode;
  msteams?: QueueMode;
  webchat?: QueueMode;
};

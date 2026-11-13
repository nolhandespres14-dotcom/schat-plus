begin;
create index if not exists ai_agents_created_by_idx
  on public.ai_agents (created_by);
create index if not exists chat_conversations_ai_agent_id_idx
  on public.chat_conversations (ai_agent_id);
commit;
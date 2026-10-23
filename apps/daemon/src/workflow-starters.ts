/** The workflows a fresh install starts with. They are ordinary files: edit or delete them freely. */
export const STARTER_WORKFLOWS: Record<string, string> = {
  'morning-briefing': `version: 1
name: Morning briefing
description: A short briefing for your day from the topics you choose. It reads no mail and no calendar.
effort: low
params:
  - key: topics
    label: Topics to cover
    type: string
    default: my day, one thing worth learning today, one small thing to look forward to
triggers:
  - type: manual
  # To run it every weekday morning, add:
  # - type: cron
  #   expr: "0 8 * * 1-5"
  #   timezone: Europe/Copenhagen
steps:
  - id: now
    type: tool
    tool: time.now
  - id: briefing
    type: prompt
    prompt: |
      Write a short morning briefing (under 200 words) for {{steps.now}}, covering: {{topics}}.
      You cannot look anything up, so say plainly when you do not know something instead of guessing.
  - id: post
    type: output
    to: inbox
    title: Morning briefing
`,
  'inbox-triage': `version: 1
name: Inbox triage
description: Reads what is waiting in your Inbox and suggests what to deal with first.
effort: low
steps:
  - id: items
    type: tool
    tool: inbox.summary
  - id: triage
    type: prompt
    prompt: |
      The data below is the list of open Inbox items as JSON. Group them into what needs a decision,
      what is only information and what can wait, then suggest the order to deal with them in.
      Keep it under 150 words.
    input: [items]
  - id: post
    type: output
    to: inbox
    title: Inbox triage
`,
  'summarise-file': `version: 1
name: Summarise file
description: Summarises one text file from a folder shared with JunOS.
effort: low
params:
  - key: path
    label: File to summarise
    type: file
    required: true
steps:
  - id: file
    type: tool
    tool: files.read
    args:
      path: "{{path}}"
  - id: summary
    type: prompt
    prompt: Summarise the file below in five bullet points. Quote nothing longer than a short phrase.
    input: [file]
  - id: post
    type: output
    to: inbox
    title: "Summary of {{path}}"
`,
}

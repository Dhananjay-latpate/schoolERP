"use client";

import { useState } from "react";
import {
  ArrowRight,
  BellRing,
  Check,
  ChevronRight,
  Eye,
  Filter,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Pin,
  Plus,
  Send,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHero } from "@/components/shared/PageHero";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { TabPills } from "@/components/shared/TabPills";
import { cn } from "@/lib/utils";

type Channel = "email" | "app" | "sms";

const ANNOUNCEMENTS: {
  title: string;
  body: string;
  author: string;
  initials: string;
  audience: string;
  time: string;
  pinned?: boolean;
  reads: number;
  channels: Channel[];
}[] = [
  {
    title: "Mid-term schedule published",
    body: "Mid-term exams begin May 22. Please find the full schedule attached. Reach out to your homeroom teacher with any clash before May 18.",
    author: "Ravi Aiyar",
    initials: "RA",
    audience: "All parents",
    time: "2 hours ago",
    pinned: true,
    reads: 842,
    channels: ["email", "app"],
  },
  {
    title: "Sports day registration open",
    body: "Inter-house registrations are now open for track, swimming, and team sports. Sign up via the activity portal before May 23.",
    author: "Gabriel Costa",
    initials: "GC",
    audience: "All students",
    time: "Yesterday · 4:15 PM",
    reads: 612,
    channels: ["app"],
  },
  {
    title: "Parent-teacher meeting · Grade 7",
    body: "PTM for Grade 7 sections is scheduled for Saturday, May 30, 9:00 – 12:00. Slots can be booked from the parent portal.",
    author: "Anita Rao",
    initials: "AR",
    audience: "Grade 7-B",
    time: "Yesterday · 11:02 AM",
    reads: 96,
    channels: ["email", "sms"],
  },
  {
    title: "Library closure — May 19",
    body: "The central library will be closed on May 19 for inventory. Self-service kiosks will remain available between 9:00 and 12:00.",
    author: "Hannah Lee",
    initials: "HL",
    audience: "All staff",
    time: "2 days ago",
    reads: 78,
    channels: ["app"],
  },
  {
    title: "Science exhibition winners",
    body: "Congratulations to Grade 11-S for winning the inter-school science exhibition with their renewable-energy installation.",
    author: "Eleanor Hughes",
    initials: "EH",
    audience: "Grade 11-S",
    time: "3 days ago",
    reads: 412,
    channels: ["app", "email"],
  },
];

const CHANNEL_ICON: Record<Channel, typeof BellRing> = {
  email: Mail,
  app: BellRing,
  sms: MessageSquare,
};

export default function AnnouncementsPage() {
  const [tab, setTab] = useState("all");
  const [channels, setChannels] = useState<Record<Channel, boolean>>({
    app: true,
    email: true,
    sms: false,
  });

  return (
    <main className="min-h-screen bg-surface-bg px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHero
          icon={BellRing}
          eyebrow="Announcements"
          title="Broadcast & communications"
          description="Send circulars, schedule recurring digests, and track read rates across audiences."
          badges={[
            { label: "124 sent this term", tone: "live" },
            { label: "86% avg. read rate" },
          ]}
          actions={
            <>
              <Button variant="secondary">
                <Filter className="mr-1.5 h-4 w-4" />
                Filter
              </Button>
              <Button variant="pay">
                <Plus className="mr-1.5 h-4 w-4" />
                New announcement
              </Button>
            </>
          }
        />

        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          {/* Feed */}
          <div className="space-y-4">
            <TabPills
              tabs={[
                { key: "all", label: "All", count: 124 },
                { key: "pinned", label: "Pinned", count: 3 },
                { key: "drafts", label: "Drafts", count: 2 },
                { key: "scheduled", label: "Scheduled", count: 5 },
              ]}
              active={tab}
              onChange={setTab}
            />

            <div className="space-y-3">
              {ANNOUNCEMENTS.map((a) => (
                <Card key={a.title} className="p-5">
                  <div className="flex items-start gap-4">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-sky-light text-sm font-semibold text-brand-royal">
                      {a.initials}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            {a.pinned && (
                              <Badge variant="warning">
                                <Pin className="mr-0.5 h-3 w-3" />
                                Pinned
                              </Badge>
                            )}
                            <h3 className="text-base font-semibold text-text-primary">{a.title}</h3>
                          </div>
                          <p className="mt-0.5 text-xs text-text-muted">
                            {a.author} · {a.audience} · {a.time}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 text-text-muted">
                          {a.channels.map((c) => {
                            const Icon = CHANNEL_ICON[c];
                            return (
                              <span
                                key={c}
                                className="grid h-7 w-7 place-items-center rounded-md bg-surface-muted text-text-secondary"
                                title={c}
                              >
                                <Icon className="h-3.5 w-3.5" />
                              </span>
                            );
                          })}
                          <button className="btn-ghost btn-sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-text-secondary">{a.body}</p>
                      <div className="mt-3 flex items-center gap-4 text-xs text-text-muted">
                        <span className="inline-flex items-center gap-1">
                          <Eye className="h-3.5 w-3.5" />
                          {a.reads} reads
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Check className="h-3.5 w-3.5" />
                          Delivered
                        </span>
                        <button className="ml-auto inline-flex items-center gap-1 font-semibold text-brand-royal hover:underline">
                          View details
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Composer */}
          <Card className="card-accent h-fit p-5">
            <SectionHeader
              eyebrow="Quick send"
              title="New announcement"
              description="Reach any audience in seconds."
            />
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Audience
                </label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {["All parents", "All students", "All staff", "Grade 7-B", "Grade 11-S"].map((a, i) => (
                    <button
                      key={a}
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors",
                        i === 0
                          ? "border-text-primary bg-text-primary text-white"
                          : "border-surface-border bg-surface-card text-text-secondary hover:bg-surface-muted",
                      )}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Title
                </label>
                <Input
                  className="mt-1.5"
                  placeholder="What's this about?"
                  defaultValue="Mid-term schedule update"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Message
                </label>
                <textarea
                  className="input-base mt-1.5 min-h-[100px] resize-none"
                  defaultValue="Please note the slight revision to Grade 9 physics exam time, now starting at 11:00 instead of 10:30."
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Channels
                </label>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  {(Object.keys(channels) as Channel[]).map((c) => {
                    const Icon = CHANNEL_ICON[c];
                    const active = channels[c];
                    return (
                      <button
                        key={c}
                        onClick={() => setChannels((s) => ({ ...s, [c]: !s[c] }))}
                        className={cn(
                          "flex items-center justify-center gap-1.5 rounded-sm border px-2 py-2 text-xs font-medium capitalize transition-colors",
                          active
                            ? "border-text-primary bg-text-primary text-white"
                            : "border-surface-border bg-surface-card text-text-secondary hover:bg-surface-muted",
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {c === "app" ? "In-app" : c}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button variant="secondary" className="flex-1 justify-center">
                  Save draft
                </Button>
                <Button variant="pay" className="flex-1 justify-center">
                  <Send className="mr-1.5 h-4 w-4" />
                  Send
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}

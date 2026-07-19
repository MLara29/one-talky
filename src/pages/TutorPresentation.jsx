import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, X, Home, Calendar, BookOpen, DollarSign, Star, User, Bell, Settings2, Video, Clock, TrendingUp, CheckCircle, AlertCircle, Globe, Mail, Phone, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";

const SLIDES = [
  {
    id: 1,
    section: "Overview",
    title: "Tutor Dashboard",
    subtitle: "Your complete teaching hub on One Talky",
    icon: Home,
    accent: "#8b5cf6",
    gradient: "from-violet-600 to-indigo-600",
    points: [],
    body: "overview",
  },
  {
    id: 2,
    section: "Dashboard",
    title: "Main Dashboard",
    subtitle: "Real-time metrics and live availability",
    icon: BarChart3,
    accent: "#3b82f6",
    gradient: "from-blue-600 to-cyan-600",
    body: "dashboard",
  },
  {
    id: 3,
    section: "Schedule",
    title: "Schedule",
    subtitle: "Define your weekly availability",
    icon: Calendar,
    accent: "#8b5cf6",
    gradient: "from-violet-600 to-purple-600",
    body: "schedule",
  },
  {
    id: 4,
    section: "My Lessons",
    title: "My Lessons",
    subtitle: "Manage all your teaching sessions",
    icon: BookOpen,
    accent: "#6366f1",
    gradient: "from-indigo-600 to-blue-600",
    body: "lessons",
  },
  {
    id: 5,
    section: "Classroom",
    title: "Live Classroom",
    subtitle: "HD video & chat during sessions",
    icon: Video,
    accent: "#0ea5e9",
    gradient: "from-blue-600 to-teal-600",
    body: "classroom",
  },
  {
    id: 6,
    section: "Earnings",
    title: "Earnings",
    subtitle: "Track income and request withdrawals",
    icon: DollarSign,
    accent: "#10b981",
    gradient: "from-emerald-600 to-teal-600",
    body: "earnings",
  },
  {
    id: 7,
    section: "Reviews",
    title: "My Reviews",
    subtitle: "Student ratings and written feedback",
    icon: Star,
    accent: "#f59e0b",
    gradient: "from-amber-500 to-orange-500",
    body: "reviews",
  },
  {
    id: 8,
    section: "Personal Info",
    title: "Personal Info",
    subtitle: "Contact details and payment setup",
    icon: User,
    accent: "#64748b",
    gradient: "from-slate-600 to-slate-700",
    body: "personal",
  },
  {
    id: 9,
    section: "Support",
    title: "Support",
    subtitle: "Get help from the One Talky team",
    icon: Bell,
    accent: "#f43f5e",
    gradient: "from-rose-600 to-pink-600",
    body: "support",
  },
  {
    id: 10,
    section: "Summary",
    title: "You're all set!",
    subtitle: "Everything you need to start teaching",
    icon: CheckCircle,
    accent: "#8b5cf6",
    gradient: "from-violet-600 to-emerald-600",
    body: "summary",
  },
];

function OverviewBody() {
  const items = [
    { icon: Home, label: "Dashboard", desc: "Live status & metrics" },
    { icon: Calendar, label: "Schedule", desc: "Set weekly availability" },
    { icon: BookOpen, label: "My Lessons", desc: "Manage all sessions" },
    { icon: DollarSign, label: "Earnings", desc: "Track & withdraw" },
    { icon: Star, label: "Reviews", desc: "Student feedback" },
    { icon: User, label: "Personal Info", desc: "Profile & payment" },
  ];
  return (
    <div className="space-y-4">
      <p className="text-gray-300 text-sm leading-relaxed">
        The Tutor Dashboard is your central workspace. From here you manage every aspect of your teaching activity in one place.
      </p>
      <div className="grid grid-cols-2 gap-3 mt-2">
        {items.map(item => (
          <div key={item.label} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-3.5">
            <div className="w-9 h-9 rounded-xl bg-violet-500/20 flex items-center justify-center shrink-0">
              <item.icon className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <p className="text-white text-sm font-semibold">{item.label}</p>
              <p className="text-gray-500 text-xs">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardBody() {
  return (
    <div className="space-y-4">
      <p className="text-gray-300 text-sm leading-relaxed">
        The main dashboard shows key performance metrics and lets you control live availability for instant lessons.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {["Total Lessons", "Total Minutes", "Average Rating", "Total Earnings"].map(s => (
          <div key={s} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
            <p className="text-gray-500 text-[10px]">{s}</p>
            <p className="text-white font-bold text-lg mt-0.5">—</p>
          </div>
        ))}
      </div>
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3">
        <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        <div>
          <p className="text-emerald-400 font-semibold text-sm">Available Now toggle</p>
          <p className="text-gray-500 text-xs mt-0.5">Activate to appear in students instant-booking search. Students can call you immediately.</p>
        </div>
      </div>
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4">
        <p className="text-blue-400 font-semibold text-sm mb-1 flex items-center gap-2">
          <Bell className="w-3.5 h-3.5" /> Incoming Lesson Alerts
        </p>
        <p className="text-gray-500 text-xs">When a student books an instant session, a pop-up alert appears so you can join the classroom immediately.</p>
      </div>
    </div>
  );
}

function ScheduleBody() {
  return (
    <div className="space-y-4">
      <p className="text-gray-300 text-sm leading-relaxed">
        Set your weekly recurring availability. Students see your slots automatically converted to their own timezone.
      </p>
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <p className="text-white font-semibold text-sm mb-2 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-violet-400" /> Interactive Calendar
        </p>
        <p className="text-gray-500 text-xs leading-relaxed">Click any future date to open the time-slot panel for that weekday. Days with configured slots are highlighted in green.</p>
      </div>
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <p className="text-white font-semibold text-sm mb-2 flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-400" /> 30-Minute Time Slots
        </p>
        <p className="text-gray-500 text-xs leading-relaxed">Toggle individual 30-minute blocks from 06:00 to 23:30. Availability is set per weekday — all Mondays share the same schedule.</p>
      </div>
      <div className="bg-violet-500/10 border border-violet-500/20 rounded-2xl p-3 flex items-start gap-2.5">
        <Globe className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
        <p className="text-xs text-violet-300">Slots are saved in your timezone. Students always see them converted to their local time — no manual conversion needed.</p>
      </div>
    </div>
  );
}

function LessonsBody() {
  return (
    <div className="space-y-4">
      <p className="text-gray-300 text-sm leading-relaxed">
        A full view of every lesson — upcoming, in-progress, and completed. Updates in real-time when students book.
      </p>
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4">
        <p className="text-blue-400 font-semibold text-sm mb-1 flex items-center gap-2">
          <Video className="w-4 h-4" /> In-Progress Lessons
        </p>
        <p className="text-gray-500 text-xs">Sessions currently active are shown at the top with a Rejoin button to re-enter the classroom at any time.</p>
      </div>
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <p className="text-white font-semibold text-sm mb-2">Upcoming tab</p>
        <ul className="space-y-1.5 text-xs text-gray-500">
          <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-violet-400" /> Student name, language and scheduled time</li>
          <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-violet-400" /> Join button to enter the classroom</li>
          <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-violet-400" /> Manage button to cancel or reschedule</li>
        </ul>
      </div>
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <p className="text-white font-semibold text-sm mb-2">Completed tab</p>
        <ul className="space-y-1.5 text-xs text-gray-500">
          <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-emerald-400" /> Duration in minutes and date</li>
          <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-emerald-400" /> Full lesson history</li>
        </ul>
      </div>
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 flex items-start gap-2.5">
        <Settings2 className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-300">Cancel or reschedule a lesson — a notification is automatically sent to the student.</p>
      </div>
    </div>
  );
}

function ClassroomBody() {
  const items = [
    { icon: Video, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", title: "HD Video Call", desc: "Real-time video and audio between tutor and student. Camera and microphone controls available." },
    { icon: Bell, color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20", title: "In-lesson Chat", desc: "Text chat alongside the video — useful for sharing words, corrections, or links during the session." },
    { icon: Clock, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", title: "Live Timer", desc: "A running timer shows the lesson duration. Used to calculate earnings automatically when the lesson ends." },
    { icon: Star, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", title: "Post-lesson Review", desc: "Students are prompted to rate the session after it ends. Reviews go directly to your Reviews page." },
  ];
  return (
    <div className="space-y-4">
      <p className="text-gray-300 text-sm leading-relaxed">
        The classroom is the live video environment where tutor and student meet. Powered by Agora real-time technology.
      </p>
      {items.map(item => (
        <div key={item.title} className={`${item.bg} border rounded-2xl p-3.5 flex items-start gap-3`}>
          <item.icon className={`w-4 h-4 ${item.color} mt-0.5 shrink-0`} />
          <div>
            <p className={`font-semibold text-sm ${item.color}`}>{item.title}</p>
            <p className="text-gray-500 text-xs mt-0.5">{item.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function EarningsBody() {
  return (
    <div className="space-y-4">
      <p className="text-gray-300 text-sm leading-relaxed">
        Full financial overview: total earned, minutes taught, per-hour rate, and a calendar showing earnings day by day.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Total Earned", icon: DollarSign, color: "text-emerald-400" },
          { label: "Minutes Taught", icon: Clock, color: "text-violet-400" },
          { label: "Rate / Hour", icon: TrendingUp, color: "text-blue-400" },
          { label: "Total Lessons", icon: Calendar, color: "text-amber-400" },
        ].map(s => (
          <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-2">
            <s.icon className={`w-4 h-4 ${s.color} shrink-0`} />
            <p className="text-xs text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <p className="text-white font-semibold text-sm mb-1 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-400" /> Earnings Calendar
        </p>
        <p className="text-gray-500 text-xs">Days with completed lessons appear highlighted. Click a day to see each lesson, student name, duration, and amount earned.</p>
      </div>
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
        <p className="text-emerald-400 font-semibold text-sm mb-2">Withdrawal System</p>
        <ul className="space-y-1 text-xs text-gray-500">
          <li>Available on the <strong className="text-white">15th and 30th</strong> of each month</li>
          <li>Paid via <strong className="text-white">Payoneer</strong> to your registered email</li>
          <li>Processed within <strong className="text-white">2 business days</strong></li>
          <li>Full withdrawal history shown on the page</li>
        </ul>
      </div>
    </div>
  );
}

function ReviewsBody() {
  return (
    <div className="space-y-4">
      <p className="text-gray-300 text-sm leading-relaxed">
        All reviews left by students after their sessions. Your average rating is calculated automatically and shown on your public profile card.
      </p>
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 text-center">
        <p className="text-5xl font-extrabold text-white mb-2">4.9</p>
        <div className="flex justify-center gap-1 mb-1">
          {[1,2,3,4,5].map(n => <Star key={n} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
        </div>
        <p className="text-gray-500 text-xs">Example — average of all ratings</p>
      </div>
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
        <p className="text-white font-semibold text-sm">Each review shows:</p>
        <ul className="space-y-1.5 text-xs text-gray-500">
          <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-amber-400" /> Student name</li>
          <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-amber-400" /> Star rating (1 to 5)</li>
          <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-amber-400" /> Written comment if provided</li>
          <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-amber-400" /> Date of the review</li>
        </ul>
      </div>
      <div className="bg-violet-500/10 border border-violet-500/20 rounded-2xl p-3">
        <p className="text-xs text-violet-300">Your average rating is visible to all students on your public profile, helping you attract more bookings.</p>
      </div>
    </div>
  );
}

function PersonalBody() {
  const fields = [
    { icon: User, color: "text-gray-400", label: "Full legal name", desc: "Your official name as shown on the platform." },
    { icon: Globe, color: "text-blue-400", label: "Nationality", desc: "Displayed on your public tutor profile." },
    { icon: Phone, color: "text-green-400", label: "Phone number", desc: "For internal contact if needed." },
    { icon: Mail, color: "text-violet-400", label: "Contact email", desc: "Receives lesson reminders, admin messages, and Payoneer payouts." },
    { icon: Bell, color: "text-amber-400", label: "Email reminders", desc: "Toggle to enable or disable email notifications before lessons." },
    { icon: DollarSign, color: "text-emerald-400", label: "Payoneer details", desc: "Bank info for direct-contract tutors. Upwork tutors are paid via Upwork." },
  ];
  return (
    <div className="space-y-3">
      <p className="text-gray-300 text-sm leading-relaxed">
        Keep your personal details and payment information up to date. This data is used for lesson reminders and monthly payouts.
      </p>
      {fields.map(item => (
        <div key={item.label} className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl p-3">
          <item.icon className={`w-4 h-4 ${item.color} mt-0.5 shrink-0`} />
          <div>
            <p className="text-white text-xs font-semibold">{item.label}</p>
            <p className="text-gray-500 text-[11px] mt-0.5">{item.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function SupportBody() {
  const steps = [
    "Click Support in the sidebar navigation",
    "Fill in a subject and describe your issue",
    "Submit — the message goes directly to the admin team",
    "Admin replies are sent to your contact email",
  ];
  return (
    <div className="space-y-4">
      <p className="text-gray-300 text-sm leading-relaxed">
        Tutors can contact the One Talky team directly through the in-app Support section for any questions or issues.
      </p>
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
        <p className="text-white font-semibold text-sm">How it works:</p>
        <div className="space-y-2">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-[10px] font-bold text-rose-400 shrink-0 mt-0.5">{i + 1}</span>
              <p className="text-xs text-gray-400">{step}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4">
        <p className="text-rose-400 font-semibold text-sm mb-2 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> Common support topics
        </p>
        <ul className="space-y-1 text-xs text-gray-500">
          <li>Payment and withdrawal questions</li>
          <li>Technical issues in the classroom</li>
          <li>Profile or account changes</li>
          <li>Student disputes or reports</li>
        </ul>
      </div>
    </div>
  );
}

function SummaryBody() {
  const steps = [
    { n: "1", label: "Set your availability", desc: "Schedule — configure weekly time slots", color: "bg-violet-500/20 text-violet-400 border-violet-500/30" },
    { n: "2", label: "Go live", desc: "Toggle Available Now to accept instant lessons", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
    { n: "3", label: "Join the classroom", desc: "My Lessons — click Join when a session starts", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    { n: "4", label: "Track your earnings", desc: "Earnings page shows real-time income per lesson", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
    { n: "5", label: "Request payout", desc: "On the 15th or 30th of each month via Payoneer", color: "bg-teal-500/20 text-teal-400 border-teal-500/30" },
    { n: "6", label: "Read your reviews", desc: "Reviews page — use feedback to improve", color: "bg-rose-500/20 text-rose-400 border-rose-500/30" },
  ];
  return (
    <div className="space-y-3">
      <p className="text-gray-300 text-sm leading-relaxed">
        You now have a complete overview of the Tutor Dashboard. Here is your quick-start workflow:
      </p>
      {steps.map(step => (
        <div key={step.n} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-3">
          <span className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 ${step.color}`}>{step.n}</span>
          <div>
            <p className="text-white text-xs font-semibold">{step.label}</p>
            <p className="text-gray-500 text-[11px]">{step.desc}</p>
          </div>
        </div>
      ))}
      <p className="text-gray-600 text-xs text-center pt-2">Questions? Use the Support section anytime.</p>
    </div>
  );
}

const BODY_MAP = {
  overview: <OverviewBody />,
  dashboard: <DashboardBody />,
  schedule: <ScheduleBody />,
  lessons: <LessonsBody />,
  classroom: <ClassroomBody />,
  earnings: <EarningsBody />,
  reviews: <ReviewsBody />,
  personal: <PersonalBody />,
  support: <SupportBody />,
  summary: <SummaryBody />,
};

export default function TutorPresentation() {
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(true);

  const goTo = (idx) => {
    if (idx < 0 || idx >= SLIDES.length) return;
    setVisible(false);
    setTimeout(() => {
      setCurrent(idx);
      setVisible(true);
    }, 180);
  };

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "ArrowRight") goTo(current + 1);
      if (e.key === "ArrowLeft") goTo(current - 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [current]);

  const slide = SLIDES[current];
  const Icon = slide.icon;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "oklch(0.10 0.005 248)" }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-white text-sm" style={{ background: "linear-gradient(135deg,#149d78,#0e7a5f)" }}>O</div>
          <span className="text-white font-semibold text-sm">One Talky — Tutor Guide</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-gray-500 text-xs">{current + 1} / {SLIDES.length}</span>
          <Link to="/dashboard">
            <button className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20">
              <X className="w-3.5 h-3.5" /> Exit
            </button>
          </Link>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 w-full bg-white/5">
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${((current + 1) / SLIDES.length) * 100}%`, background: slide.accent }}
        />
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-5xl mx-auto w-full px-4 sm:px-8 py-8 gap-8">
        {/* Left */}
        <div className="lg:w-80 shrink-0 flex flex-col justify-center">
          <div style={{ opacity: visible ? 1 : 0, transition: "opacity 0.18s" }}>
            <span className="text-xs font-semibold uppercase tracking-widest mb-4 block" style={{ color: slide.accent }}>
              {slide.section}
            </span>
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${slide.gradient} flex items-center justify-center mb-5 shadow-lg`}>
              <Icon className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight mb-3">{slide.title}</h1>
            <p className="text-gray-400 text-base leading-relaxed">{slide.subtitle}</p>
            {/* Dots */}
            <div className="flex gap-1.5 mt-8 flex-wrap">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  style={{
                    width: i === current ? "24px" : "8px",
                    height: "8px",
                    borderRadius: "4px",
                    background: i === current ? slide.accent : "oklch(0.25 0.01 248)",
                    transition: "all 0.3s",
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="flex-1">
          <div
            className="h-full rounded-3xl p-6 overflow-y-auto"
            style={{
              background: "oklch(0.14 0.008 248)",
              border: "1px solid oklch(0.22 0.01 248)",
              opacity: visible ? 1 : 0,
              transition: "opacity 0.18s",
            }}
          >
            {BODY_MAP[slide.body]}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-white/10">
        <button
          onClick={() => goTo(current - 1)}
          disabled={current === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-white/5 border border-white/10 text-gray-400 hover:text-white"
        >
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>

        <span className="text-gray-600 text-xs hidden sm:block">Use arrow keys to navigate</span>

        {current < SLIDES.length - 1 ? (
          <button
            onClick={() => goTo(current + 1)}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ background: slide.accent }}
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <Link to="/dashboard">
            <button className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90" style={{ background: "linear-gradient(135deg,#149d78,#0e7a5f)" }}>
              Go to Dashboard <ChevronRight className="w-4 h-4" />
            </button>
          </Link>
        )}
      </div>
    </div>
  );
}
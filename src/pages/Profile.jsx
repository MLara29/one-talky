import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { User, Save, Camera, Upload, Eye, Video } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pioneerEmail, setPioneerEmail] = useState("");
  const [activeTab, setActiveTab] = useState("personal");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const role = user?.role;

  useEffect(() => { loadProfile(); }, [user]);

  const loadProfile = async () => {
    try {
      if (role === "tutor") {
        const profiles = await base44.entities.TutorProfile.filter({ user_id: user.id });
        if (profiles.length > 0) {
          const p = profiles[0];
          setProfile(p);
          try {
            const bi = JSON.parse(p.bank_info || "{}");
            setPioneerEmail(bi.pioneer_email || "");
          } catch {}
        }
      } else {
        const profiles = await base44.entities.StudentProfile.filter({ user_id: user.id });
        if (profiles.length > 0) setProfile(profiles[0]);
      }
    } catch {} finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      if (role === "tutor") {
        const updates = { full_name: profile.full_name, bio: profile.bio };
        if (profile.contract_type !== "upwork") {
          updates.bank_info = JSON.stringify({ pioneer_email: pioneerEmail });
        }
        await base44.entities.TutorProfile.update(profile.id, updates);
      } else {
        await base44.entities.StudentProfile.update(profile.id, { full_name: profile.full_name });
      }
      await base44.auth.updateMe({ full_name: profile.full_name });
      toast({ title: "Profile saved! ✅" });
    } catch { toast({ title: "Error saving", variant: "destructive" }); } finally { setSaving(false); }
  };

  const handlePhotoUpload = async (file) => {
    if (!file || !profile) return;
    setUploadingPhoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.TutorProfile.update(profile.id, { photo_url: file_url });
      setProfile({ ...profile, photo_url: file_url });
      toast({ title: "Photo updated! 📸" });
    } catch { toast({ title: "Error uploading photo", variant: "destructive" }); } finally { setUploadingPhoto(false); }
  };

  const handleVideoUpload = async (file) => {
    if (!file || !profile) return;
    setUploadingVideo(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.TutorProfile.update(profile.id, { intro_video_url: file_url });
      setProfile({ ...profile, intro_video_url: file_url });
      toast({ title: "Intro video updated! 🎥" });
    } catch { toast({ title: "Error uploading video", variant: "destructive" }); } finally { setUploadingVideo(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
    </div>
  );

  const isUpwork = profile?.contract_type === "upwork";

  // For non-tutors, render simple profile
  if (role !== "tutor") {
    return (
      <div className="max-w-lg mx-auto">
        <h1 className="theme-heading font-display text-2xl sm:text-3xl font-bold text-white mb-8">My Profile</h1>
        <div className="theme-card bg-white/5 border border-white/10 rounded-3xl p-6 space-y-5">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="theme-heading font-display font-bold text-white">{profile?.full_name}</p>
              <p className="theme-subtext text-sm text-gray-500 capitalize">{role}</p>
            </div>
          </div>
          <div>
            <Label className="theme-subtext text-gray-500 text-sm">Full name</Label>
            <Input
              value={profile?.full_name || ""}
              onChange={e => setProfile({ ...profile, full_name: e.target.value })}
              className="theme-input mt-1.5 bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-orange-500/50"
            />
          </div>
          <Button onClick={handleSave} disabled={saving}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0 shadow-lg shadow-orange-500/20 hover:scale-105 transition-all">
            <Save className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="theme-heading font-display text-2xl sm:text-3xl font-bold text-white mb-6">My Profile</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 bg-white/5 border border-white/10 rounded-2xl">
        <button
          onClick={() => setActiveTab("personal")}
          className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${
            activeTab === "personal"
              ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Personal Info
        </button>
        <button
          onClick={() => setActiveTab("public")}
          className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${
            activeTab === "public"
              ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30"
              : "text-gray-400 hover:text-white"
          }`}
        >
          My Public Profile
        </button>
      </div>

      {/* Personal Info Tab */}
      {activeTab === "personal" && (
        <div className="theme-card bg-white/5 border border-white/10 rounded-3xl p-6 space-y-5">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="theme-heading font-display font-bold text-white">{profile?.full_name}</p>
              <div className="flex items-center gap-2">
                <p className="theme-subtext text-sm text-gray-500 capitalize">Tutor</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                  isUpwork
                    ? "bg-blue-500/10 border-blue-500/20 text-blue-400"
                    : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                }`}>
                  {isUpwork ? "Upwork" : "Direct"}
                </span>
              </div>
            </div>
          </div>

          <div>
            <Label className="theme-subtext text-gray-500 text-sm">Full name</Label>
            <Input
              value={profile?.full_name || ""}
              onChange={e => setProfile({ ...profile, full_name: e.target.value })}
              className="theme-input mt-1.5 bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-orange-500/50"
            />
          </div>

          <div>
            <Label className="theme-subtext text-gray-500 text-sm">Contact email (for lesson reminders and admin messages)</Label>
            <Input
              type="email"
              value={pioneerEmail}
              onChange={e => setPioneerEmail(e.target.value)}
              placeholder="your@email.com"
              className="theme-input mt-1.5 bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-orange-500/50"
            />
            <p className="theme-subtext text-xs text-gray-500 mt-1">Used to receive lesson reminders and messages from the administrator.</p>
          </div>

          {isUpwork ? (
            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
              <p className="text-xs text-blue-400 font-medium">💼 Upwork contract — payments processed directly through Upwork. No Payoneer details needed.</p>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-xs text-emerald-600 font-medium">💳 Direct contract — make sure the email above matches your Payoneer account for payouts on the 15th and 30th.</p>
            </div>
          )}

          <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20">
            <p className="theme-subtext text-xs text-orange-400 font-medium">
              💡 Your lesson rate is set by the administrator: <strong>${(profile?.price_per_minute || 0.5).toFixed(2)}/min</strong> (${((profile?.price_per_minute || 0.5) * 30).toFixed(2)} per 30-min session).
            </p>
          </div>

          <Button onClick={handleSave} disabled={saving}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0 shadow-lg shadow-orange-500/20 hover:scale-105 transition-all">
            <Save className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      )}

      {/* Public Profile Tab */}
      {activeTab === "public" && (
        <div className="space-y-4">
          {/* Photo card */}
          <div className="theme-card bg-white/5 border border-white/10 rounded-3xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-4 h-4 text-orange-400" />
              <p className="text-sm font-semibold text-orange-400">This information is visible to students on the platform</p>
            </div>

            {/* Nome público */}
            <div className="mb-5">
              <Label className="theme-subtext text-gray-500 text-sm block mb-1">Public name</Label>
              <p className="text-xs text-orange-400 mb-2">👤 This is the name students will see on your card and profile. It can be your first name, nickname or whatever you prefer to be called.</p>
              <Input
                value={profile?.full_name || ""}
                onChange={e => setProfile({ ...profile, full_name: e.target.value })}
                placeholder="e.g. Helena, Prof. Carlos, Teacher Ana..."
                className="theme-input bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-orange-500/50"
              />
            </div>

            <Label className="theme-subtext text-gray-500 text-sm block mb-3">Profile photo</Label>
            <div className="flex items-center gap-5">
              <div className="relative shrink-0">
                <img
                  src={profile?.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.full_name || "T")}&background=F26A1B&color=fff&size=80`}
                  alt="Profile photo"
                  className="w-24 h-24 rounded-2xl object-cover ring-2 ring-orange-500/30"
                />
                {uploadingPhoto && (
                  <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 flex-1">
                {/* Galeria */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => { if (e.target.files[0]) handlePhotoUpload(e.target.files[0]); e.target.value = ""; }}
                />
                {/* Câmera — capture="user" abre câmera frontal no mobile */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  className="hidden"
                  onChange={e => { if (e.target.files[0]) handlePhotoUpload(e.target.files[0]); e.target.value = ""; }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { fileInputRef.current.value = ""; fileInputRef.current.click(); }}
                  disabled={uploadingPhoto}
                  className="theme-btn-ghost border-white/10 text-gray-400 hover:text-white justify-start"
                >
                  <Upload className="w-4 h-4 mr-2" /> Upload from gallery
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { cameraInputRef.current.value = ""; cameraInputRef.current.click(); }}
                  disabled={uploadingPhoto}
                  className="theme-btn-ghost border-white/10 text-gray-400 hover:text-white justify-start"
                >
                  <Camera className="w-4 h-4 mr-2" /> Take photo now
                </Button>
              </div>
            </div>
          </div>

          {/* Intro video card */}
          <div className="theme-card bg-white/5 border border-white/10 rounded-3xl p-6 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Video className="w-4 h-4 text-orange-400" />
              <Label className="theme-subtext text-gray-500 text-sm">Intro video</Label>
            </div>
            <p className="text-xs text-orange-400">🎥 A short intro video helps students connect with you before booking a lesson. Keep it under 2 minutes!</p>
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={e => { if (e.target.files[0]) handleVideoUpload(e.target.files[0]); e.target.value = ""; }}
            />
            {profile?.intro_video_url ? (
              <div className="space-y-3">
                <video src={profile.intro_video_url} controls className="w-full rounded-xl bg-black" style={{ maxHeight: 220 }} />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => videoInputRef.current.click()}
                  disabled={uploadingVideo}
                  className="theme-btn-ghost border-white/10 text-gray-400 hover:text-white justify-start"
                >
                  <Upload className="w-4 h-4 mr-2" /> {uploadingVideo ? "Uploading..." : "Replace video"}
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => videoInputRef.current.click()}
                disabled={uploadingVideo}
                className="theme-btn-ghost border-white/10 text-gray-400 hover:text-white justify-start"
              >
                <Upload className="w-4 h-4 mr-2" /> {uploadingVideo ? "Uploading..." : "Upload intro video"}
              </Button>
            )}
          </div>

          {/* Bio card */}
          <div className="theme-card bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
            <div>
              <Label className="theme-subtext text-gray-500 text-sm block mb-1">Bio — Introduction for students</Label>
              <p className="text-xs text-orange-400 mb-3">
                ✨ Write a brief introduction about yourself: your experience, teaching style and what students can expect from your lessons. This text will appear on your public profile.
              </p>
              <Textarea
                value={profile?.bio || ""}
                onChange={e => setProfile({ ...profile, bio: e.target.value.slice(0, 300) })}
                placeholder="e.g. Hi! I'm an English teacher with 5 years of experience. Specialised in conversation and pronunciation for beginners and intermediate learners..."
                className="theme-input h-32 bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-orange-500/50"
              />
              <p className="theme-subtext text-xs text-gray-500 mt-1 text-right">{(profile?.bio || "").length}/300 characters</p>
            </div>

            <Button onClick={handleSave} disabled={saving}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0 shadow-lg shadow-orange-500/20 hover:scale-105 transition-all">
              <Save className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Save public profile"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
'use client';

import React, { useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';
import { Upload, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Turnstile } from '@marsidev/react-turnstile';

interface FormData {
  modUrl: string;
  modName: string;
  description: string;
  category: string;
  submitterName: string;
  submitterEmail: string;
}

interface FormErrors {
  [key: string]: string;
}

export default function SubmitModPage() {
  const [formData, setFormData] = useState<FormData>({
    modUrl: '',
    modName: '',
    description: '',
    category: 'Gameplay',
    submitterName: '',
    submitterEmail: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [submitMessage, setSubmitMessage] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  // Client-side validation
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // URL validation
    const urlPattern = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
    if (!formData.modUrl.trim()) {
      newErrors.modUrl = 'Mod URL is required';
    } else if (!urlPattern.test(formData.modUrl)) {
      newErrors.modUrl = 'Please enter a valid URL';
    }

    // Mod name validation
    if (!formData.modName.trim()) {
      newErrors.modName = 'Mod name is required';
    } else if (formData.modName.length < 3) {
      newErrors.modName = 'Mod name must be at least 3 characters';
    } else if (formData.modName.length > 200) {
      newErrors.modName = 'Mod name must be less than 200 characters';
    }

    // Description validation
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length < 20) {
      newErrors.description = 'Description must be at least 20 characters';
    } else if (formData.description.length > 2000) {
      newErrors.description = 'Description must be less than 2000 characters';
    }

    // Submitter name validation
    if (!formData.submitterName.trim()) {
      newErrors.submitterName = 'Your name is required';
    } else if (formData.submitterName.length > 100) {
      newErrors.submitterName = 'Name must be less than 100 characters';
    }

    // Email validation
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.submitterEmail.trim()) {
      newErrors.submitterEmail = 'Email is required';
    } else if (!emailPattern.test(formData.submitterEmail)) {
      newErrors.submitterEmail = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Validate CAPTCHA
    if (!captchaToken) {
      setSubmitStatus('error');
      setSubmitMessage('Please complete the CAPTCHA verification');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const response = await fetch('/api/submit-mod', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          captchaToken,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitStatus('success');
        setSubmitMessage('Thank you! Your mod submission has been received and will be reviewed by our team.');
        // Reset form and captcha
        setFormData({
          modUrl: '',
          modName: '',
          description: '',
          category: 'Gameplay',
          submitterName: '',
          submitterEmail: '',
        });
        setCaptchaToken(null);
      } else {
        setSubmitStatus('error');
        setSubmitMessage(data.message || 'Failed to submit mod. Please try again later.');
      }
    } catch (error) {
      setSubmitStatus('error');
      setSubmitMessage('An error occurred. Please try again later.');
      console.error('Submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-mhm-dark text-slate-200 flex flex-col font-sans">
      <Navbar />

      <main className="flex-grow">
        {/* Hero Section */}
        <div className="relative overflow-hidden bg-gradient-to-br from-mhm-dark via-[#1a1f3a] to-mhm-dark border-b border-white/5">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
          <div className="container mx-auto px-4 py-16 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 bg-sims-pink/10 border border-sims-pink/20 rounded-full px-6 py-2 mb-6">
                <Upload className="h-4 w-4 text-sims-pink" />
                <span className="text-sm font-semibold text-sims-pink">Submit</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight">
                Submit a{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-sims-pink via-purple-400 to-sims-blue animate-gradient">
                  Mod
                </span>
              </h1>
              <p className="text-slate-400 text-lg">
                Found an amazing mod? Share it with our community!
              </p>
            </div>
          </div>
        </div>

        {/* Form Section */}
        <div className="container mx-auto px-4 py-16 pb-24">
          <div className="max-w-3xl mx-auto">

            {/* Status Messages */}
            {submitStatus === 'success' && (
              <div className="mb-8 bg-green-500/10 border border-green-500/20 rounded-2xl p-6 flex items-start gap-4">
                <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-lg font-semibold text-green-500 mb-2">Success!</h3>
                  <p className="text-slate-300">{submitMessage}</p>
                </div>
              </div>
            )}

            {submitStatus === 'error' && (
              <div className="mb-8 bg-red-500/10 border border-red-500/20 rounded-2xl p-6 flex items-start gap-4">
                <AlertCircle className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-lg font-semibold text-red-500 mb-2">Error</h3>
                  <p className="text-slate-300">{submitMessage}</p>
                </div>
              </div>
            )}

            {/* Info Box */}
            <div className="mb-8 bg-sims-blue/10 border border-sims-blue/20 rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="h-5 w-5 text-sims-blue flex-shrink-0 mt-0.5" />
                <div className="text-sm text-slate-300 leading-relaxed">
                  <p className="mb-2">
                    Submit mods that you think the community would love! Our team will review your submission and add it to our database if approved.
                  </p>
                  <p>
                    Please ensure the mod is safe, works properly, and doesn't violate any terms of service.
                  </p>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-2xl p-8 md:p-12 backdrop-blur-sm space-y-6">

              {/* Mod URL */}
              <div>
                <label htmlFor="modUrl" className="block text-sm font-semibold text-white mb-2">
                  Mod URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  id="modUrl"
                  name="modUrl"
                  value={formData.modUrl}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 bg-white/5 border ${
                    errors.modUrl ? 'border-red-500' : 'border-white/10'
                  } rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sims-pink focus:border-transparent transition-all`}
                  placeholder="https://example.com/mod-link"
                />
                {errors.modUrl && (
                  <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.modUrl}
                  </p>
                )}
              </div>

              {/* Mod Name */}
              <div>
                <label htmlFor="modName" className="block text-sm font-semibold text-white mb-2">
                  Mod Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="modName"
                  name="modName"
                  value={formData.modName}
                  onChange={handleChange}
                  maxLength={200}
                  className={`w-full px-4 py-3 bg-white/5 border ${
                    errors.modName ? 'border-red-500' : 'border-white/10'
                  } rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sims-pink focus:border-transparent transition-all`}
                  placeholder="Enter the mod name"
                />
                {errors.modName && (
                  <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.modName}
                  </p>
                )}
              </div>

              {/* Category */}
              <div>
                <label htmlFor="category" className="block text-sm font-semibold text-white mb-2">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-sims-pink focus:border-transparent transition-all"
                >
                  <option value="Gameplay">Gameplay</option>
                  <option value="Build/Buy">Build/Buy</option>
                  <option value="CAS">Create-A-Sim (CAS)</option>
                  <option value="UI/UX">UI/UX</option>
                  <option value="Script Mod">Script Mod</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-semibold text-white mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={6}
                  maxLength={2000}
                  className={`w-full px-4 py-3 bg-white/5 border ${
                    errors.description ? 'border-red-500' : 'border-white/10'
                  } rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sims-pink focus:border-transparent transition-all resize-none`}
                  placeholder="Tell us about this mod. What makes it special? What does it add to the game?"
                />
                <div className="flex justify-between mt-2">
                  <div>
                    {errors.description && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        {errors.description}
                      </p>
                    )}
                  </div>
                  <p className="text-sm text-slate-500">
                    {formData.description.length}/2000
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-white/10 pt-6">
                <h3 className="text-lg font-semibold text-white mb-4">Your Information</h3>
              </div>

              {/* Submitter Name */}
              <div>
                <label htmlFor="submitterName" className="block text-sm font-semibold text-white mb-2">
                  Your Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="submitterName"
                  name="submitterName"
                  value={formData.submitterName}
                  onChange={handleChange}
                  maxLength={100}
                  className={`w-full px-4 py-3 bg-white/5 border ${
                    errors.submitterName ? 'border-red-500' : 'border-white/10'
                  } rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sims-pink focus:border-transparent transition-all`}
                  placeholder="Enter your name"
                />
                {errors.submitterName && (
                  <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.submitterName}
                  </p>
                )}
              </div>

              {/* Submitter Email */}
              <div>
                <label htmlFor="submitterEmail" className="block text-sm font-semibold text-white mb-2">
                  Your Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="submitterEmail"
                  name="submitterEmail"
                  value={formData.submitterEmail}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 bg-white/5 border ${
                    errors.submitterEmail ? 'border-red-500' : 'border-white/10'
                  } rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sims-pink focus:border-transparent transition-all`}
                  placeholder="your.email@example.com"
                />
                {errors.submitterEmail && (
                  <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.submitterEmail}
                  </p>
                )}
                <p className="mt-2 text-sm text-slate-500">
                  We'll only use this to contact you about your submission.
                </p>
              </div>

              {/* CAPTCHA Verification */}
              <div className="flex justify-center">
                <Turnstile
                  siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'}
                  onSuccess={(token) => setCaptchaToken(token)}
                  onError={() => setCaptchaToken(null)}
                  onExpire={() => setCaptchaToken(null)}
                  options={{
                    theme: 'dark',
                    size: 'normal',
                  }}
                />
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting || !captchaToken}
                  className="w-full bg-gradient-to-r from-sims-pink to-purple-600 text-white font-bold px-8 py-4 rounded-lg hover:scale-105 transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-3"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Upload className="h-5 w-5" />
                      Submit Mod
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

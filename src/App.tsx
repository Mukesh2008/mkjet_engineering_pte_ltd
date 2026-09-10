import { FormEvent, TouchEvent, useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import {
  ArrowLeft, ArrowRight, Award, Bath, Building2, Check, ChevronDown, Clock3, Droplets, Gauge,
  Hammer, Headphones, House, Mail, MapPin, Menu, MessageCircle, Phone, Play, Quote, ShieldCheck,
  Sparkles, Star, Truck, Wrench, X, Zap
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AdminApp from '@/AdminApp';
import { Analytics } from '@vercel/analytics/react';

type Review = { id: string; customer_name: string; rating: number; review: string; service: string | null; created_at: string };

type FormMessage = { type: 'success' | 'error'; text: string } | null;

type ServiceDetail = {
  icon: typeof Wrench; number: string; title: string; text: string; accent: string;
  image: string; tagline: string; description: string;
  features: string[]; process: { step: string; detail: string }[];
};

const serviceImages = [
  '/assets/images/cleaning.jpeg',
  '/assets/images/electrical.jpeg',
  '/assets/images/installation.jpeg',
  '/assets/images/pipe1.jpeg',
  '/assets/images/pump2.jpeg',
  '/assets/images/commber.webp',
  '/assets/images/motor.webp',
  '/assets/images/residen.avif',
  '/assets/images/emer.jpg',
  '/assets/images/block.jpeg',
  '/assets/images/24h.png',
  '/assets/images/inst.webp',
];

const whatsappNumber = '6581676161';
const openWhatsApp = (service?: string) => {
  const message = service ? `Hello MK Jet Plumbing, I would like help with ${service}.` : 'Hello MK Jet Plumbing, I would like to enquire about your services.';
  window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
};

const services: ServiceDetail[] = [
  {
    icon: Droplets, number: '01', title: 'Blockage Clearing', text: 'Fast, thorough unblocking for sinks, toilets, drains and main lines.', accent: 'cyan',
    image: '/assets/images/installation.jpeg',
    tagline: 'Clear the block. Restore the flow. Protect your property.',
    description: 'Blocked drains cause odour, slow drainage and eventually backflow if left untreated. Our team uses a combination of mechanical augers and high-pressure water jetting to clear blockages at the source — whether that is grease build-up, tree root intrusion, or foreign objects. We do not just punch a hole through the blockage; we clean the pipe wall so the problem does not return next month.',
    features: ['Kitchen and bathroom drain unblocking', 'Toilet and floor trap clearing', 'Main line and secondary pipe clearing', 'Grease and scale removal', 'Tree root cutting and removal', 'Post-clean flow verification'],
    process: [{ step: 'Locate', detail: 'We identify the blockage point and likely cause.' }, { step: 'Clear', detail: 'Mechanical or jet cleaning removes the obstruction.' }, { step: 'Clean', detail: 'Pipe walls are flushed to prevent rapid re-blockage.' }, { step: 'Verify', detail: 'We confirm full flow is restored before finishing.' }],
  },
  {
    icon: Gauge, number: '02', title: 'High-Pressure Jetting', text: 'Industrial water-jet power for pipes, drains and stubborn build-up.', accent: 'blue',
    image: '/assets/images/cleaning.jpeg',
    tagline: 'Up to 2,500 PSI of engineered cleaning power.',
    description: 'High-pressure water jetting is the most effective way to clean pipes and drains that have accumulated stubborn scale, grease, silt or mineral deposits. Our jetting equipment delivers focused water streams at up to 2,500 PSI, cutting through build-up that mechanical rods cannot reach. It is chemical-free, leaves no residue, and restores pipes to near-original internal diameter — improving flow and preventing premature re-blockage.',
    features: ['Up to 2,500 PSI jet pressure', 'Grease, fat and oil removal', 'Mineral and limescale descaling', 'Silt and debris flushing', 'Pre- and post-jet CCTV inspection', 'Chemical-free, environmentally safe'],
    process: [{ step: 'Inspect', detail: 'CCTV survey identifies build-up and pipe condition.' }, { step: 'Jet', detail: 'High-pressure nozzles clean the pipe wall thoroughly.' }, { step: 'Flush', detail: 'Debris is flushed clear of the system.' }, { step: 'Confirm', detail: 'Post-jet CCTV verifies the pipe is fully clean.' }],
  },
  {
    icon: Truck, number: '03', title: 'Vacuum Tanker Service', text: 'Powerful suction for septic tanks, manholes and large-scale waste removal.', accent: 'sky',
    image: '/assets/images/vehiclemk.jpeg',
    tagline: 'Industrial-grade extraction for commercial and residential waste.',
    description: 'Our vacuum tanker service handles large-volume liquid and sludge removal that conventional methods cannot manage. From septic tank pumping to manhole clearing and industrial waste extraction, our tanker fleet delivers powerful suction with safe, compliant disposal. Ideal for commercial buildings, construction sites, and residential properties with large-capacity waste systems.',
    features: ['Septic tank pumping and cleaning', 'Manhole and grease trap emptying', 'Construction site waste removal', 'Industrial sludge extraction', 'Compliant disposal and documentation', 'Scheduled maintenance contracts'],
    process: [{ step: 'Assess', detail: 'We evaluate the volume and type of waste to be removed.' }, { step: 'Extract', detail: 'Our tanker safely pumps out liquid and sludge.' }, { step: 'Transport', detail: 'Waste is transported to an approved disposal facility.' }, { step: 'Document', detail: 'You receive a compliance record for your files.' }],
  },
  {
    icon: Wrench, number: '04', title: 'Installation', text: 'Professional installation of fixtures, pipes and plumbing systems.', accent: 'cyan',
    image: '/assets/images/inst.webp',
    tagline: 'Installed right the first time, built to last.',
    description: 'Whether you are renovating a bathroom, fitting a new kitchen, or installing a complete plumbing system for a commercial property, our licensed plumbers deliver clean, precise installation work. We use quality fittings and follow engineering-grade standards, so every connection, fixture and pipe is built to perform reliably for years.',
    features: ['Tap, mixer and fixture installation', 'Water heater installation', 'Toilet and cistern fitting', 'Kitchen and bathroom plumbing', 'Pipe routing and repiping', 'Commercial plumbing systems'],
    process: [{ step: 'Plan', detail: 'We review the layout and confirm the installation plan.' }, { step: 'Prepare', detail: 'Quality parts and fittings are sourced for the job.' }, { step: 'Install', detail: 'Clean, precise workmanship with minimal disruption.' }, { step: 'Test', detail: 'Every connection is pressure-tested before we leave.' }],
  },
  {
    icon: Hammer, number: '05', title: 'Repair', text: 'Rapid, reliable repairs for leaks, bursts and faulty fixtures.', accent: 'blue',
    image: '/assets/images/pipe1.jpeg',
    tagline: 'When something breaks, we fix it properly.',
    description: 'A dripping tap, a running toilet, a burst pipe — plumbing faults are disruptive and wasteful. Our repair team responds quickly, diagnoses the issue accurately, and carries out a lasting fix rather than a temporary patch. We work cleanly, explain what we are doing, and leave your space tidy.',
    features: ['Leak repair and detection', 'Burst pipe repair and replacement', 'Tap and mixer repair', 'Toilet and cistern repair', 'Water heater repair', 'Pipe rerouting and replacement'],
    process: [{ step: 'Diagnose', detail: 'We identify the root cause, not just the symptom.' }, { step: 'Quote', detail: 'You get a clear explanation and upfront pricing.' }, { step: 'Repair', detail: 'We carry out a lasting fix with quality parts.' }, { step: 'Verify', detail: 'We test the repair and clean up before leaving.' }],
  },
  {
    icon: Zap, number: '06', title: 'Motor & Pump Service', text: 'Installation, repair and maintenance of water pumps and motors.', accent: 'sky',
    image: '/assets/images/motor.webp',
    tagline: 'Keep your water moving with reliable pump performance.',
    description: 'Water pumps and motors are the heart of any plumbing system — when they fail, everything stops. Our technicians install, repair and service all types of water pumps, booster pumps, and sewage motors. We diagnose faults quickly, use quality replacement parts, and ensure your system runs efficiently and quietly.',
    features: ['Water pump installation', 'Booster pump repair', 'Sewage pump servicing', 'Motor replacement', 'Pressure tank maintenance', 'Pump performance testing'],
    process: [{ step: 'Inspect', detail: 'We assess the pump or motor and identify the fault.' }, { step: 'Service', detail: 'We repair or replace components as needed.' }, { step: 'Test', detail: 'The system is run under load to verify performance.' }, { step: 'Maintain', detail: 'We recommend a schedule to prevent future failures.' }],
  },
  {
    icon: ShieldCheck, number: '07', title: 'Maintenance', text: 'Preventive inspections and scheduled servicing for lasting performance.', accent: 'cyan',
    image: '/assets/images/pump2.jpeg',
    tagline: 'Prevent the problem before it becomes an emergency.',
    description: 'The most expensive plumbing repair is the one you did not plan for. Our preventive maintenance programme uses CCTV pipe inspection and scheduled cleaning to catch small issues — hairline cracks, partial blockages, root intrusion — before they become costly failures. For residential, commercial and industrial properties, we build a maintenance schedule that suits your infrastructure and budget.',
    features: ['CCTV pipe condition surveys', 'Scheduled drain and pipe cleaning', 'Root intrusion monitoring', 'Grease trap servicing schedules', 'Maintenance reporting and records', 'Priority response for plan members'],
    process: [{ step: 'Survey', detail: 'CCTV inspection maps your pipe condition and risks.' }, { step: 'Plan', detail: 'We build a maintenance schedule around your needs.' }, { step: 'Maintain', detail: 'Scheduled cleaning and inspection keeps things flowing.' }, { step: 'Review', detail: 'Regular reports track condition and flag emerging issues.' }],
  },
  {
    icon: Clock3, number: '08', title: 'Emergency Plumbing', text: 'Rapid response when a plumbing issue cannot wait until tomorrow.', accent: 'blue',
    image: '/assets/images/emer.jpg',
    tagline: 'When water is rising, minutes matter.',
    description: 'A burst pipe, an overflowing toilet, or a sudden loss of water pressure cannot wait for business hours. Our emergency response team is ready to deploy quickly with the tools and parts to stop the damage, stabilise the situation, and arrange a permanent repair. We communicate clearly throughout — you will know what is happening, what we are doing about it, and what comes next.',
    features: ['Rapid response across Singapore', 'Burst pipe and flood response', 'Emergency blockage clearance', 'Water heater failure repair', 'Temporary and permanent fixes', 'Clear communication throughout'],
    process: [{ step: 'Call', detail: 'Tell us the situation — we prioritise urgent cases.' }, { step: 'Respond', detail: 'Our team arrives with the right equipment ready.' }, { step: 'Stabilise', detail: 'We stop the immediate problem and prevent further damage.' }, { step: 'Resolve', detail: 'A permanent repair is planned and carried out.' }],
  },
  {
    icon: Bath, number: '09', title: 'HVAC Support', text: 'Air-conditioning drainage, condensate lines and water management.', accent: 'sky',
    image: 'https://images.pexels.com/photos/7347538/pexels-photo-7347538.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    tagline: 'Plumbing expertise for your cooling and drainage systems.',
    description: 'Air-conditioning systems depend on clean condensate drainage to function properly. Clogged drain lines cause water leaks, ceiling damage and reduced cooling efficiency. Our team provides specialist HVAC drainage support — clearing condensate lines, installing drain pumps, and ensuring your cooling system manages water safely and efficiently.',
    features: ['Condensate drain line clearing', 'Drain pump installation and repair', 'AC water leak diagnosis', 'Condensate pipe replacement', 'Preventive drainage maintenance', 'Commercial HVAC drainage support'],
    process: [{ step: 'Assess', detail: 'We inspect the AC drainage system for blockages or faults.' }, { step: 'Clear', detail: 'Condensate lines are flushed and blockages removed.' }, { step: 'Repair', detail: 'Faulty pumps or pipes are repaired or replaced.' }, { step: 'Maintain', detail: 'We schedule regular checks to prevent future leaks.' }],
  },
  {
    icon: Building2, number: '10', title: 'Commercial Plumbing', text: 'Reliable plumbing systems for offices, facilities, retail and industrial sites.', accent: 'blue',
    image: '/assets/images/commer.webp',
    tagline: 'Built for demanding properties and busy environments.',
    description: 'Commercial plumbing needs dependable planning, responsive maintenance and minimal disruption. We support offices, retail spaces, facilities and industrial sites with installation, repairs, drainage, pump systems and planned maintenance that keeps your operation moving.',
    features: ['Commercial pipework and fixtures', 'Plant room and pump systems', 'Grease trap and drainage service', 'Backflow and leak response', 'Planned maintenance contracts', 'Site reporting and documentation'],
    process: [{ step: 'Survey', detail: 'We review your site, systems and operational requirements.' }, { step: 'Plan', detail: 'We recommend a practical scope with clear priorities.' }, { step: 'Deliver', detail: 'Work is completed safely with minimal disruption.' }, { step: 'Support', detail: 'Ongoing maintenance keeps your systems reliable.' }],
  },
  {
    icon: House, number: '11', title: 'Residential Plumbing', text: 'Friendly plumbing help for homes, apartments and family properties.', accent: 'cyan',
    image: '/assets/images/residen.avif',
    tagline: 'Thoughtful workmanship for the place you call home.',
    description: 'From a leaking tap to a full bathroom upgrade, our residential team provides clean, considerate plumbing service for homes and apartments. We explain the issue clearly, protect your space and leave every job tidy.',
    features: ['Kitchen and bathroom plumbing', 'Leak detection and repair', 'Toilet and water heater service', 'Fixture and pipe installation', 'Home drainage clearing', 'Apartment plumbing support'],
    process: [{ step: 'Listen', detail: 'We understand the issue and how it affects your home.' }, { step: 'Inspect', detail: 'We find the cause and explain the options.' }, { step: 'Fix', detail: 'We complete the repair with care and quality parts.' }, { step: 'Clean', detail: 'We test the system and leave your space tidy.' }],
  },
  {
    icon: Zap, number: '12', title: 'Electrical Services', text: 'Safe electrical installation, repairs and maintenance for homes and businesses.', accent: 'sky',
    image: '/assets/images/electrical.jpeg',
    tagline: 'Careful electrical work, clearly explained and safely delivered.',
    description: 'Our electrical services cover essential installation, troubleshooting and maintenance for residential and commercial properties. We work methodically, keep safety at the centre of every job and coordinate plumbing and electrical requirements when projects overlap.',
    features: ['Electrical fault finding', 'Lighting and power installation', 'Distribution board work', 'Pump and motor wiring', 'Safety checks and maintenance', 'Commercial electrical support'],
    process: [{ step: 'Assess', detail: 'We inspect the system and identify the source of the issue.' }, { step: 'Explain', detail: 'You receive a clear scope before work begins.' }, { step: 'Complete', detail: 'The work is carried out safely and neatly.' }, { step: 'Test', detail: 'We test the installation before handover.' }],
  },
  {
    icon: Clock3, number: '13', title: '24-Hour Emergency Services', text: 'Round-the-clock plumbing and electrical response when you need help now.', accent: 'blue',
    image: '/assets/images/24h.png',
    tagline: 'Urgent support, day or night, for serious property issues.',
    description: 'Emergencies do not follow office hours. Our 24-hour response service helps with burst pipes, flooding, major blockages, pump failures and urgent electrical faults. We act quickly to make the situation safe, limit damage and restore essential services.',
    features: ['24-hour emergency response', 'Burst pipe and flooding support', 'Urgent blockage clearing', 'Pump and motor failure response', 'Electrical fault isolation', 'Temporary and permanent solutions'],
    process: [{ step: 'Call', detail: 'Tell us what has happened and where you are.' }, { step: 'Respond', detail: 'We prioritise the situation and dispatch the right team.' }, { step: 'Secure', detail: 'We make the area safe and limit further damage.' }, { step: 'Resolve', detail: 'We restore service and explain the next steps.' }],
  },
  
];

const reasons = [
  ['24/7', 'Rapid response', 'We move quickly when your property needs us most.'],
  ['15+', 'Years of craft', 'Proven field experience across residential and commercial work.'],
  ['4.9/5', 'Customer rating', 'Consistently trusted for clean work and clear communication.'],
];

const fallbackReviews: Review[] = [
  { id: '1', customer_name: 'Marcus Tan', rating: 5, review: 'Excellent drain cleaning service. Professional, quick and left the area spotless.', service: 'Blockage Clearing', created_at: '2025-01-01' },
  { id: '2', customer_name: 'Sarah Lim', rating: 5, review: 'The team found a hidden leak that two other companies missed. Outstanding work.', service: 'Repair', created_at: '2025-01-01' },
  { id: '3', customer_name: 'Daniel Koh', rating: 5, review: 'Clear quote, arrived on time and fixed our recurring blockage in one visit.', service: 'High-Pressure Jetting', created_at: '2025-01-01' },
];

function useReveal() {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.06, rootMargin: '0px 0px -50px 0px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref as RefObject<HTMLElement>;
}

function useScrollProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(scrollHeight > 0 ? window.scrollY / scrollHeight : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return progress;
}

function App() {
  const [adminRoute, setAdminRoute] = useState<'super-admin' | 'admin' | null>(() => { const hash = window.location.hash; if (hash === '#super-admin') return 'super-admin'; if (hash === '#admin') return 'admin'; return null; });
  useEffect(() => {
    const onHashChange = () => { const hash = window.location.hash; if (hash === '#super-admin') setAdminRoute('super-admin'); else if (hash === '#admin') setAdminRoute('admin'); else setAdminRoute(null); };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  if (adminRoute) return <AdminApp route={adminRoute} />;

  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceDetail | null>(null);
  const [reviews, setReviews] = useState<Review[]>(fallbackReviews);
  const [reviewMessage, setReviewMessage] = useState<FormMessage>(null);
  const [newsletterMessage, setNewsletterMessage] = useState<FormMessage>(null);
  const [enquiryMessage, setEnquiryMessage] = useState<FormMessage>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [newsletterLoading, setNewsletterLoading] = useState(false);
  const [enquiryLoading, setEnquiryLoading] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const loadReviews = async () => {
      const { data } = await client.from('reviews').select('id, customer_name, rating, review, service, created_at').eq('status', 'approved').order('created_at', { ascending: false }).limit(12);
      if (data && data.length > 0) setReviews(data as Review[]);
    };
    void loadReviews();
    const channel = client.channel('approved-reviews').on('postgres_changes', { event: '*', schema: 'public', table: 'reviews', filter: 'status=eq.approved' }, () => { void loadReviews(); }).subscribe();
    return () => { void client.removeChannel(channel); };
  }, []);

  const averageRating = useMemo(() => (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1), [reviews]);

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const submitEnquiry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEnquiryLoading(true); setEnquiryMessage(null);
    const form = new FormData(event.currentTarget);
    const payload = { name: form.get('name'), email: form.get('email'), phone: form.get('phone'), service: form.get('service'), message: form.get('message') };
    if (!supabase) { setEnquiryMessage({ type: 'error', text: 'The enquiry service is temporarily unavailable. Please call us directly.' }); setEnquiryLoading(false); return; }
    const { error } = await supabase.from('enquiries').insert(payload);
    setEnquiryLoading(false);
    if (error) { setEnquiryMessage({ type: 'error', text: 'We could not send your enquiry. Please try again or call us directly.' }); return; }
    setEnquiryMessage({ type: 'success', text: 'Thank you. Your enquiry has been submitted and our team will be in touch shortly.' });
    event.currentTarget.reset();
  };

  const submitNewsletter = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setNewsletterLoading(true); setNewsletterMessage(null);
    const form = new FormData(event.currentTarget); const email = String(form.get('email') || '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setNewsletterMessage({ type: 'error', text: 'Please enter a valid email address.' }); setNewsletterLoading(false); return; }
    if (!supabase) { setNewsletterMessage({ type: 'error', text: 'Subscription is temporarily unavailable. Please try again shortly.' }); setNewsletterLoading(false); return; }
    const { error } = await supabase.from('newsletter_subscribers').upsert({ email }, { onConflict: 'email' });
    setNewsletterLoading(false);
    if (error) { setNewsletterMessage({ type: 'error', text: 'We could not complete your subscription. Please try again.' }); return; }
    setNewsletterMessage({ type: 'success', text: 'You are subscribed. Welcome to the MK Jet community.' }); event.currentTarget.reset();
  };

  const submitReview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setReviewLoading(true); setReviewMessage(null);
    const form = new FormData(event.currentTarget);
    if (!supabase) { setReviewMessage({ type: 'error', text: 'Reviews are temporarily unavailable. Please try again later.' }); setReviewLoading(false); return; }
    const { error } = await supabase.from('reviews').insert({ customer_name: form.get('name'), email: form.get('email'), rating: Number(form.get('rating')), review: form.get('review'), service: form.get('service'), status: 'pending' });
    setReviewLoading(false);
    if (error) { setReviewMessage({ type: 'error', text: 'We could not submit your review. Please check your details and try again.' }); return; }
    setReviewMessage({ type: 'success', text: 'Thank you. Your review has been sent for approval.' }); event.currentTarget.reset();
  };

  const scrollProgress = useScrollProgress();

  return (
    <div className="site-shell">
      <div className="water-bg" aria-hidden="true">
        <div className="waterfall-layer" />
        <div className="waterflow-layer" />
        <div className="droplets-layer">
          {Array.from({ length: 24 }).map((_, i) => <span key={i} style={{ left: `${(i * 4.17) % 100}%`, animationDelay: `${(i * 0.37) % 6}s`, animationDuration: `${5 + (i % 4)}s` }} />)}
        </div>
      </div>
      <div className="scroll-progress" style={{ transform: `scaleX(${scrollProgress})` }} />
      <div className="top-strip"><div className="container top-strip-inner"><span><Sparkles size={13} /> Singapore's plumbing and drainage specialists</span><span className="top-contact">
  <a href="tel:+6581676161">
    <Phone size={13} />
    +65 81676161
  </a>

  <span className="strip-divider" />

  <a href="tel:+6583546161">
    <Phone size={13} />
    +65 83546161
  </a>

  <span className="strip-divider" />

  <a href="mailto:sales@mkjetengineering.com">
    <Mail size={13} />
   sales@mkjetengineering.com
  </a>
</span></div></div>
      <header className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
        <div className="container nav-inner">
          <button className="brand" onClick={() => scrollTo('home')} aria-label="MK Jet Plumbing Services home"><span className="brand-mark"><img src="/assets/images/mklogo1.png" alt="" /></span><span className="brand-copy"><strong>MK JETTING</strong><small>& ENGINEERING PTE LTD</small></span></button>
          <nav className={`nav-links ${menuOpen ? 'nav-open' : ''}`} aria-label="Main navigation">
            {['home', 'services', 'about', 'reviews', 'contact'].map((item) => <button key={item} onClick={() => scrollTo(item)}>{item}</button>)}
            <button className="nav-cta mobile-cta" onClick={() => { setMenuOpen(false); setQuoteOpen(true); }}>Get a free quote <ArrowRight size={15} /></button>
          </nav>
          <button className="nav-cta desktop-cta" onClick={() => setQuoteOpen(true)}>Get a free quote <ArrowRight size={15} /></button>
          <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">{menuOpen ? <X /> : <Menu />}</button>
        </div>
      </header>

      <main>
        <section id="home" className="hero-section fade-in">
          <video className="hero-video-bg" autoPlay muted loop playsInline poster="https://images.pexels.com/photos/4194866/pexels-photo-4194866.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"><source src="https://videos.pexels.com/video-files/13808065/13808065-hd_1920_1080_25fps.mp4" type="video/mp4" /></video>
          <div className="hero-video-overlay" />
          <div className="hero-grid" /><div className="hero-orb orb-one" /><div className="hero-orb orb-two" />
          <div className="water-line line-one" /><div className="water-line line-two" />
          <div className="container hero-content">
            <div className="hero-copy"><div className="eyebrow light"><span className="eyebrow-dot" /> Engineered for flow</div><h1>POWERFUL JETS<br /><span>CLEANER DRAINS.</span><br />SMARTER SOLUTIONS.</h1><p className="hero-lede">Professional plumbing, drain cleaning and water-jet solutions for homes and businesses across Singapore.</p><div className="hero-actions"><button className="button button-primary" onClick={() => setQuoteOpen(true)}>Get a free quote <ArrowRight size={17} /></button><button className="button button-ghost" onClick={() => scrollTo('services')}><Play size={15} fill="currentColor" /> Explore our services</button></div><div className="hero-trust"><div className="avatar-stack"><span>MT</span><span>SL</span><span>DK</span></div><div><div className="stars"><Star size={13} fill="currentColor" /><Star size={13} fill="currentColor" /><Star size={13} fill="currentColor" /><Star size={13} fill="currentColor" /><Star size={13} fill="currentColor" /><b>4.9/5</b></div><small>Trusted by Singapore homes & businesses</small></div><div className="google-review-badge"><span className="google-icon" aria-hidden="true">G</span><span><strong>4.5</strong><span className="google-stars" aria-label="4.5 out of 5 stars">★★★★★</span><small>Google reviews</small></span></div></div></div>
          </div>
          <div className="hero-bottom"><div className="container metric-row"><div><strong>01</strong><span>Rapid response<br />when it matters</span></div><div><strong>02</strong><span>Clean work<br />every time</span></div><div><strong>03</strong><span>Built on<br />trust</span></div><div className="scroll-hint"><span>Scroll to explore</span><ChevronDown size={16} /></div></div></div>
        </section>

        <IntroSection />

        <ServicesSection services={services} setSelectedService={setSelectedService} />

        <AboutSection reasons={reasons} onQuote={() => setQuoteOpen(true)} scrollTo={scrollTo} />

        <ProcessSection />

        <ReviewsSection reviews={reviews} averageRating={averageRating} />

        <ContactSection services={services} submitEnquiry={submitEnquiry} enquiryMessage={enquiryMessage} enquiryLoading={enquiryLoading} />

        <NewsletterSection submitNewsletter={submitNewsletter} newsletterMessage={newsletterMessage} newsletterLoading={newsletterLoading} />

        <ReviewFormSection services={services} submitReview={submitReview} reviewMessage={reviewMessage} reviewLoading={reviewLoading} />
      </main>

      <footer className="footer"><div className="container footer-grid"><div><button className="brand footer-brand" onClick={() => scrollTo('home')}><span className="brand-mark"><img src="/assets/images/mklogo1.png" alt="" /></span><span className="brand-copy"><strong>MK JETTING</strong><small>& ENGINEERING PTE LTD</small></span></button><p>Professional plumbing, drainage and water-jet solutions engineered for Singapore.</p></div><div><h4>Explore</h4><button onClick={() => scrollTo('services')}>Services</button><button onClick={() => scrollTo('about')}>About us</button><button onClick={() => scrollTo('reviews')}>Reviews</button></div><div><h4>Contact</h4><a href="tel:+6581676161">+65 81676161</a><a href="tel:+6583546161"> +65 83546161</a><a href="mailto:sales@mkjetengineering.com">sales@mkjetengineering.com</a><span>Rowell Road, Singapore</span></div></div><div className="container footer-bottom"><span>© 2025 MK Jetting & Engineering Pte Ltd. All rights reserved.</span><span>Built for better flow.</span></div></footer>


      {selectedService && <ServiceDetailOverlay service={selectedService} onClose={() => setSelectedService(null)} onQuote={() => { setSelectedService(null); setQuoteOpen(true); }} />}

      {quoteOpen && <div className="modal-backdrop" onClick={() => setQuoteOpen(false)}><div className="quote-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setQuoteOpen(false)} aria-label="Close quote form"><X size={18} /></button><div className="eyebrow">Fast response</div><h2>Get your free <em>quote.</em></h2><p>Tell us a little about what is happening. We will get back to you with a clear next step.</p><form onSubmit={(event) => { setQuoteOpen(false); void submitEnquiry(event); }}><label>Full name<input name="name" required placeholder="Your name" /></label><label>Phone number<input name="phone" required placeholder="+65" /></label><label>What do you need help with?<select name="service" defaultValue=""><option value="" disabled>Select a service</option>{services.map((service) => <option key={service.title}>{service.title}</option>)}</select></label><button className="button button-primary full-button">Request a quote <ArrowRight size={16} /></button></form></div></div>}
      <Analytics />
    </div>
  );
}

function IntroSection() {
  const ref = useReveal();
  return <section className="intro-section reveal" ref={ref}><div className="container intro-grid"><div className="intro-heading"><div className="eyebrow">Our approach</div><h2>Water problems deserve <em>engineering solutions.</em></h2></div><div className="intro-copy"><p>From a stubborn blockage to a hidden leak, we bring the right equipment, the right expertise and the right attitude to every job.</p><button className="text-link" onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}>Why MK Jet Plumbing Services <ArrowRight size={16} /></button></div></div></section>;
}

function ServicesSection({ services, setSelectedService }: { services: ServiceDetail[]; setSelectedService: (s: ServiceDetail | null) => void }) {
  const ref = useReveal();
  return <section id="services" className="services-section section-pad reveal" ref={ref}><div className="container"><div className="section-heading-row"><div><div className="eyebrow">What we do</div><h2>Precision in every <em>drop.</em></h2></div><p>Practical solutions, delivered with the quality and care your property deserves.</p></div><div className="service-grid reveal-stagger">{services.map(({ icon: Icon, number, title, text, accent, image }) => <article className={`service-card accent-${accent}`} key={title} onClick={() => setSelectedService(services.find((service) => service.title === title) ?? null)}><div className="service-card-image"><img src={image} alt={`${title} service`} loading="lazy" /></div><div className="service-card-body"><div className="service-card-top"><span className="service-number">{number}</span><span className="service-icon"><Icon size={22} /></span></div><h3>{title}</h3><p>{text}</p><button className="card-link" type="button">View photos and details <ArrowUpRightIcon /></button></div></article>)}</div></div></section>;
}

function AboutSection({ reasons, onQuote, scrollTo }: { reasons: string[][]; onQuote: () => void; scrollTo: (id: string) => void }) {
  const ref = useReveal();
  return <section id="about" className="about-section section-pad reveal-left" ref={ref}><div className="container about-grid"><div className="about-visual"><div className="about-gallery"><div className="about-gallery-main"><img src="/assets/images/a1.jpg" alt="MK Jet plumbing work and pipe systems" /></div><div className="about-gallery-side"><img src="/assets/images/a2.jpg" alt="MK Jet technician working on a drainage system" /><img src="/assets/images/a3.jpg" alt="Commercial water pump equipment" /></div><div className="about-gallery-bottom"><img src="/assets/images/a6.jpeg" alt="Electrical control panel installation" /><img src="/assets/images/a5.jpeg" alt="Industrial plumbing pump room" /></div><div className="about-badge"><Award size={20} /><span><strong>15+ years</strong><small>of field experience</small></span></div></div><div className="experience-caption"><span>MK / 2009—2025</span><span>Engineering the flow</span></div></div><div className="about-copy"><div className="eyebrow">Why choose us</div><h2>Good service is the difference between a fix and a <em>solution.</em></h2><p>We are a hands-on team of plumbing, electrical and drainage specialists who believe the best work is clean, considered and built to last.</p><div className="reason-list">{reasons.map(([stat, title, text]) => <div className="reason" key={title}><strong>{stat}</strong><div><h4>{title}</h4><p>{text}</p></div></div>)}</div><button className="button button-dark" onClick={onQuote}>Work with us <ArrowRight size={16} /></button></div></div></section>;
}

function ProcessSection() {
  const ref = useReveal();
  return <section className="process-section section-pad reveal-scale" ref={ref}><div className="container"><div className="process-intro"><div><div className="eyebrow light">How it works</div><h2>From first call to <em>clear flow.</em></h2></div><p>A straightforward process, with no guesswork and no hidden surprises.</p></div><div className="process-grid reveal-stagger">{[['01', 'Contact us', 'Tell us what is happening and we will help you find the next step.'], ['02', 'Inspect', 'Our team assesses the issue and recommends the right solution.'], ['03', 'Get it done', 'We arrive prepared and complete the work with care.'], ['04', 'Problem solved', 'You get a clean, reliable result — and peace of mind.']].map(([number, title, text], index) => <div className="process-step" key={number}><div className="process-number">{number}<span>{index < 3 && <ArrowRight size={15} />}</span></div><h3>{title}</h3><p>{text}</p></div>)}</div></div></section>;
}

function ReviewsSection({ reviews, averageRating }: { reviews: Review[]; averageRating: string }) {
  const ref = useReveal();
  return <section id="reviews" className="reviews-section section-pad reveal-right" ref={ref}><div className="container"><div className="section-heading-row review-heading"><div><div className="eyebrow">Customer stories</div><h2>Flowing words from <em>happy customers.</em></h2></div><div className="rating-summary"><strong>{averageRating}</strong><div><div className="stars"><Star size={14} fill="currentColor" /><Star size={14} fill="currentColor" /><Star size={14} fill="currentColor" /><Star size={14} fill="currentColor" /><Star size={14} fill="currentColor" /></div><small>Based on {reviews.length} reviews</small></div></div></div><div className="review-grid reveal-stagger">{reviews.slice(0, 3).map((review) => <article className="review-card" key={review.id}><Quote size={23} className="quote-icon" /><div className="stars">{Array.from({ length: review.rating }).map((_, index) => <Star key={index} size={13} fill="currentColor" />)}</div><p>"{review.review}"</p><div className="review-author"><span>{review.customer_name.split(' ').map((name) => name[0]).join('')}</span><div><strong>{review.customer_name}</strong><small>{review.service || 'Verified customer'}</small></div></div></article>)}</div><button className="text-link centered-link" onClick={() => document.getElementById('review-form')?.scrollIntoView({ behavior: 'smooth' })}>Share your experience <ArrowRight size={16} /></button></div></section>;
}

function ContactSection({ services, submitEnquiry, enquiryMessage, enquiryLoading }: { services: ServiceDetail[]; submitEnquiry: (event: FormEvent<HTMLFormElement>) => void; enquiryMessage: FormMessage; enquiryLoading: boolean }) {
  const ref = useReveal();
  return <section id="contact" className="contact-section section-pad reveal-left" ref={ref}><div className="container contact-grid"><div className="contact-copy"><div className="eyebrow light">Start a conversation</div><h2>Let's get your <em>flow</em> back.</h2><p>Have a plumbing or drainage issue? Tell us a little about it and our team will get back to you shortly.</p><div className="contact-details"><a href="tel:+6581676161"><span><Phone size={18} /></span><div><small>Call us anytime</small><strong>+65 81676161</strong></div></a><a href="tel:+6583546161"><span><Phone size={18} /></span><div><strong>+65 83546161</strong></div></a><a href="mailto:sales@mkjetengineering.com"><span><Mail size={18} /></span><div><small>Email the team</small><strong>sales@mkjetengineering.com</strong></div></a><div><span><MapPin size={18} /></span><div><small>Find our workshop</small><strong>Blk 640, #01-68, Rowell Road<br />Singapore 200640</strong></div></div></div><a className="directions-link" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent('Blk 640, #01-68, Rowell Road, Singapore 200640')}`} target="_blank" rel="noreferrer"><MapPin size={15} /> Get directions</a></div><form className="enquiry-form glass-panel" onSubmit={submitEnquiry}><div className="form-heading"><span>01 / Enquiry</span><h3>Tell us what you need.</h3></div><div className="form-row"><label>Full name<input name="name" required placeholder="Your name" /></label><label>Phone number<input name="phone" required placeholder="+65" /></label></div><label>Email address<input name="email" type="email" required placeholder="you@company.com" /></label><label>Service required<select name="service" defaultValue=""><option value="" disabled>Select a service</option>{services.map((service) => <option key={service.title}>{service.title}</option>)}</select></label><label>How can we help?<textarea name="message" required rows={4} placeholder="Tell us a little about the issue..." /></label>{enquiryMessage && <FormNotice message={enquiryMessage} />}<button className="button button-primary full-button" disabled={enquiryLoading}>{enquiryLoading ? 'Sending...' : 'Send enquiry'} <ArrowRight size={16} /></button></form></div></section>;
}

function NewsletterSection({ submitNewsletter, newsletterMessage, newsletterLoading }: { submitNewsletter: (event: FormEvent<HTMLFormElement>) => void; newsletterMessage: FormMessage; newsletterLoading: boolean }) {
  const ref = useReveal();
  return <section className="newsletter-section reveal-scale" ref={ref}><div className="container newsletter-inner"><div><div className="eyebrow">The MK Jet journal</div><h2>Stay in the <em>know.</em></h2><p>Useful plumbing tips, service updates and offers — delivered occasionally, never noisily.</p></div><form className="newsletter-form" onSubmit={submitNewsletter}><div className="newsletter-input"><Mail size={17} /><input name="email" type="email" placeholder="Your email address" required /><button disabled={newsletterLoading}>{newsletterLoading ? 'Joining...' : 'Subscribe'} <ArrowRight size={15} /></button></div>{newsletterMessage && <FormNotice message={newsletterMessage} />}</form></div></section>;
}

function ReviewFormSection({ services, submitReview, reviewMessage, reviewLoading }: { services: ServiceDetail[]; submitReview: (event: FormEvent<HTMLFormElement>) => void; reviewMessage: FormMessage; reviewLoading: boolean }) {
  const ref = useReveal();
  return <section id="review-form" className="review-form-section section-pad reveal-right" ref={ref}><div className="container review-form-grid"><div><div className="eyebrow">Your experience</div><h2>Help others find a <em>better fix.</em></h2><p>We read every review. Share your experience and help us keep raising the bar.</p></div><form className="review-form" onSubmit={submitReview}><div className="form-row"><label>Name<input name="name" required placeholder="Your name" /></label><label>Email<input name="email" type="email" required placeholder="you@email.com" /></label></div><div className="form-row"><label>Rating<select name="rating" defaultValue="5"><option value="5">5 — Excellent</option><option value="4">4 — Great</option><option value="3">3 — Good</option><option value="2">2 — Fair</option><option value="1">1 — Poor</option></select></label><label>Service<select name="service" defaultValue=""><option value="">Select a service</option>{services.map((service) => <option key={service.title}>{service.title}</option>)}</select></label></div><label>Your review<textarea name="review" required rows={3} placeholder="What was your experience like?" /></label>{reviewMessage && <FormNotice message={reviewMessage} />}<button className="button button-dark" disabled={reviewLoading}>{reviewLoading ? 'Submitting...' : 'Submit review'} <ArrowRight size={16} /></button><button type="button" className="button button-whatsapp review-whatsapp-btn" onClick={() => openWhatsApp()}><MessageCircle size={16} /> WhatsApp us</button></form></div></section>;
}

function FormNotice({ message }: { message: FormMessage }) { return message ? <div className={`form-notice ${message.type}`}><span>{message.type === 'success' ? <Check size={14} /> : <X size={14} />}</span>{message.text}</div> : null; }
function ArrowUpRightIcon() { return <ArrowRight size={15} className="arrow-up-right" />; }

function ServiceDetailOverlay({ service, onClose, onQuote }: { service: ServiceDetail; onClose: () => void; onQuote: () => void }) {
  const Icon = service.icon;
  const [activeImage, setActiveImage] = useState(0);
  const touchStart = useRef<number | null>(null);
  const touchEnd = useRef<number | null>(null);
  const images = [service.image, ...serviceImages.filter((img) => img !== service.image)];
  const showPrevious = () => setActiveImage((current) => (current - 1 + images.length) % images.length);
  const showNext = () => setActiveImage((current) => (current + 1) % images.length);
  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => { touchStart.current = event.touches[0]?.clientX ?? null; touchEnd.current = null; };
  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => { touchEnd.current = event.touches[0]?.clientX ?? null; };
  const handleTouchEnd = () => { if (touchStart.current === null || touchEnd.current === null) return; const distance = touchStart.current - touchEnd.current; if (Math.abs(distance) > 45) { if (distance > 0) showNext(); else showPrevious(); } touchStart.current = null; touchEnd.current = null; };
  return (
    <div className="modal-backdrop service-detail-backdrop" onClick={onClose}>
      <div className="service-detail" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close service details"><X size={18} /></button>
        <div className="service-detail-hero service-carousel" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
          <img src={images[activeImage]} alt={`${service.title} work example ${activeImage + 1}`} />
          <div className="service-detail-hero-overlay" />
          <button className="carousel-arrow carousel-prev" onClick={showPrevious} aria-label="Previous service image"><ArrowLeft size={18} /></button>
          <button className="carousel-arrow carousel-next" onClick={showNext} aria-label="Next service image"><ArrowRight size={18} /></button>
          <div className="carousel-dots" aria-label="Service image carousel">{images.map((image, index) => <button key={image} className={index === activeImage ? 'active' : ''} onClick={() => setActiveImage(index)} aria-label={`Show service image ${index + 1}`} />)}</div>
          <div className="service-detail-hero-content">
            <div className="service-detail-badge"><span className="service-icon"><Icon size={20} /></span><span className="service-number">{service.number}</span></div>
            <h2>{service.title}</h2>
            <p>{service.tagline}</p>
          </div>
        </div>
          <div className="service-detail-body">
          <p className="service-detail-description">{service.description}</p>
          <div className="service-detail-section">
            <h3>What we cover</h3>
            <div className="service-features-grid">{service.features.map((feature) => <div className="service-feature" key={feature}><Check size={16} /><span>{feature}</span></div>)}</div>
          </div>
          <div className="service-detail-section">
            <h3>How we approach it</h3>
            <div className="service-process">{service.process.map((item, index) => <div className="service-process-step" key={item.step}><span className="service-process-number">0{index + 1}</span><div><strong>{item.step}</strong><p>{item.detail}</p></div></div>)}</div>
          </div>
          <div className="service-detail-actions">
            <button className="button button-primary" onClick={onQuote}>Get a quote for this service <ArrowRight size={16} /></button>
            <button className="button button-whatsapp" onClick={() => openWhatsApp(service.title)}><MessageCircle size={16} /> WhatsApp us</button>
            <button className="button button-ghost" onClick={onClose}><ArrowLeft size={15} /> Back to services</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

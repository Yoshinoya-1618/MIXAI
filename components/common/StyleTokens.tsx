export default function StyleTokens() {
  return (
    <style>{`
      :root{ 
        --brand:#6D5EF7; 
        --brandAlt:#9B6EF3; 
        --accent:#22D3EE; 
        --bg:transparent;
        --indigo: #6366F1;
        --blue: #22D3EE;
        --magenta: #F472B6;
      }
      .btn-primary{ background:linear-gradient(135deg,var(--indigo),var(--blue)); color:#fff; border-radius:12px; padding:10px 16px; font-weight:600; transition: all 0.3s ease; }
      .btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 20px 40px -12px rgba(99, 102, 241, 0.4); }
      .btn-secondary{ background:#fff; border:1px solid #d1d5db; color:#374151; border-radius:12px; padding:10px 16px; font-weight:600; transition: all 0.3s ease; }
      .btn-secondary:hover:not(:disabled) { background:#f9fafb; }
      .btn-ghost{ background:#fff; border:1px solid #EAEAF0; color:#111827; border-radius:12px; padding:10px 14px; font-weight:600; }
      .card{ background:#fff; border:1px solid #EEF0F4; border-radius:12px; box-shadow:0 6px 18px rgba(17,24,39,.04); }
      .glass-card{ background:rgba(255,255,255,0.6); backdrop-filter:blur(12px); border:1px solid rgba(255,255,255,0.2); box-shadow:0 8px 32px rgba(31,38,135,0.37); border-radius:16px; }
      .input{ background:#fff; border:1px solid #EAEAF0; border-radius:8px; padding:12px 14px; width:100%; font-size:14px; }
      .input:focus{ outline:none; border-color:var(--brand); box-shadow:0 0 0 3px rgba(109,94,247,0.1); }
      /* Hero specific */
      .btn-hero{ background:#fff; color:#1f2937; border-radius:12px; padding:10px 16px; font-weight:700; box-shadow:0 6px 16px rgba(0,0,0,.08); }
      .btn-hero-ghost{ background:transparent; color:#fff; border:1px solid rgba(255,255,255,.6); border-radius:12px; padding:10px 14px; font-weight:700; }
      .card-hero{ background:rgba(255,255,255,.12); border:1px solid rgba(255,255,255,.28); border-radius:12px; backdrop-filter:blur(8px); padding:14px; }
    `}</style>
  )
}
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { email, name, username } = await req.json();
    const recipient = email?.trim();
    if (!recipient) {
      return NextResponse.json({ error: "Missing recipient email" }, { status: 400 });
    }

    const displayName = name || username || "Learner";
    const handle = username ? `@${username}` : "DSA Student";

    // ── EMAIL 1: Welcome & Greeting Email ──
    const subject1 = `Welcome to DSA⁴⁰⁴, ${displayName}! 🚀`;
    const text1 = `Hello ${displayName} (${handle}),

Welcome to the DSA⁴⁰⁴ community! We are thrilled to have you join us.

Core Motto:
"Set your pace. Stay consistent. Control the controllables."

Success in technical interviews is not about blindly solving 1000 problems—it is about mastering core patterns, building daily consistency, and tracking your growth.

You have taken the first step toward structured DSA mastery.

Happy Coding!
- The 404 DSA Team`;

    const html1 = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #090d16; color: #f8fafc; margin: 0; padding: 20px; }
    .card { max-width: 600px; margin: 0 auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    .logo { font-size: 24px; font-weight: 900; color: #38bdf8; letter-spacing: -0.5px; }
    .logo-orange { color: #f97316; }
    .quote-box { background: linear-gradient(135deg, #0284c7 0%, #0f172a 100%); border: 1px solid #38bdf8; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
    .quote-text { margin: 0; font-size: 17px; color: #fbbf24; font-weight: 800; font-family: monospace; }
    .quote-sub { margin-top: 8px; font-size: 13px; color: #cbd5e1; font-style: italic; }
    .footer { margin-top: 32px; font-size: 12px; color: #64748b; text-align: center; border-top: 1px solid #1e293b; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">DSA<span class="logo-orange">⁴⁰⁴</span></div>
    <h2 style="margin-top: 16px; font-size: 22px; color: #f8fafc;">Welcome to DSA⁴⁰⁴, ${displayName}! 🚀</h2>
    <p style="color: #94a3b8; font-size: 15px; line-height: 1.6;">
      Hello <strong>${displayName}</strong> (<span style="color: #38bdf8;">${handle}</span>),
      <br/><br/>
      Welcome to the <strong>DSA⁴⁰⁴</strong> community! We are super excited to help you prepare systematically for your coding interviews and master Data Structures & Algorithms.
    </p>

    <div class="quote-box">
      <p class="quote-text">"Set your pace. Stay consistent. Control the controllables."</p>
      <p class="quote-sub">— The 404 DSA Team Core Principle</p>
    </div>

    <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
      Remember: The goal isn't just to solve 404 problems. The goal is to <strong>master the patterns</strong> behind them. Take it one day at a time, stick to your daily pace, and let the plan rebalance automatically when life happens.
    </p>

    <p style="color: #94a3b8; font-size: 14px; margin-top: 20px;">
      Warm regards,<br/>
      <strong style="color: #38bdf8;">The 404 DSA Team</strong>
    </p>

    <div class="footer">
      DSA⁴⁰⁴ · Built for structured, consistent DSA practice
    </div>
  </div>
</body>
</html>`;

    // ── EMAIL 2: Comprehensive Platform Features & Settings Guide ──
    const subject2 = `📖 Complete Guide: DSA⁴⁰⁴ Features, Roadmap Settings & Patterns`;
    const text2 = `Here is your complete guide to all features and settings in DSA⁴⁰⁴:

1.Settings Tab:
   - Install PWA application for better experience.
   - Adjust your preferences of no of problems you can solve per day i.e.,easy,medium,hard.you can restart by choosing the date.
   - you can pause the preparation and resume it when you want.if you have any exams or other works for long period.
   - Notification in section you need to enable the Browser notifications and Test it once is that notificaitons are getting or not.
   - you can set reminders for every session like morning and evening at a specific time to reminde you.
   - for contests reminders will be sent on that day,before 1hr and 10 mins of the contest starts.
   - you can change the name password and Delete account completely.
   
2. Coder Profile tab
   - Public Profile & Coding Handles:
   - Update your bio profile pic, goal and Banner.
   - After all changes in profile click on save button.
   - Now your profile is live and you can share it with anyone.By clicking on share profile.
   - Your Shareable Link: /profile/${username || "your_handle"}.
   - Connect handles for LeetCode, Codeforces, CodeChef, AtCoder, HackerRank, GeeksforGeeks (GFG), GitHub.

Built-in Integrations:
   - ⚡ Solve (AI Tutor): Interactive Socratic ChatGPT hints untill you understand the pattern or topic unless you specified will not give any code.
   - ▶ YouTube: One-click video solutions fro the related problem.
   - 🔍 Google Search: Scoped search results across major platforms.

3.Todays Workspace tab(Daily problems and contests): 
   - In this you can see all the topics and problems assigned to you for that day.
   - In heatmap you can see your progress in terms of days. and on click of any day you can see the problems assigned to you for that day.
   - Contest section you can see all the upcoming contests for that day.By clicking on that you can directly go to the contest page and register for it.
   - these postpone,borrow,merge,delete/skip,bookmark,revision mode are the buttons that will help you to adjust your workload accordingly.
   - Postpone: Shift unfinished days forward automatically.
   - Borrow: Pull a problem from future days into today.
   - Merge: Combine today's workload with tomorrow.
   - Delete / Skip: Remove or skip days/topics.
   - Bookmark (Review Deck): Flag problems to revise.
   - Revision Mode: Schedule weekly topic revisions.
   - Bottom you can write notes for that day and can revise on sunday

4. Practice Tab:
   - where you can practice problems that are not in the roadmap or you want to practice more on a specific topic.
   - for every problem you can save the code,keypoints and submission link and can view any time(make sure that you are saving correct because you revise that afterwards).

5. Topics Tab & Weeks Tab:
   - Skip known topics & unskip anytime from Topics tab.
   - In Week section you can see all the weeks and the topics covered in that week.
   - Daily Pace Customizer (Easy, Medium, Hard limits).

6. Review tab and backlog tab:
   - In Review tab you can see all the problems that you have bookmarked and you can revise them.
   - And also can set email reminder for revision of that particular topic and any specifed date with custom message.
   - In Backlog tab you can see all the problems or days that you have missed or not solved yet and you can revise them.

7. Progress tab and Contests tab
   - In progress tab you can see your progress in terms of weeks and topics in the form of heatmap.
   - still no of days left to comlete.you can see all badges you have earned and also total no of problems you have solved by topic wise.
   - In Contests tab you can see all the upcoming contests for that day.By clicking on that you can directly go to the contest page and register for it.
   - if any contest is missed on any platform you can pracitce them on their respective platform in virtul or paritice mode
   
Save/Print this guide as a PDF for offline reference anytime!

- The 404 DSA Team`;

    const html2 = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #090d16; color: #f8fafc; margin: 0; padding: 20px; }
    .card { max-width: 680px; margin: 0 auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    .badge { display: inline-block; background: rgba(56,189,248,0.15); color: #38bdf8; border: 1px solid rgba(56,189,248,0.3); padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: bold; font-family: monospace; }
    h2 { font-size: 22px; color: #f8fafc; margin-top: 12px; }
    h3 { font-size: 16px; color: #38bdf8; margin-top: 20px; border-bottom: 1px solid #1e293b; padding-bottom: 6px; }
    .feature-item { background: #1e293b; border-radius: 10px; padding: 14px 18px; margin-bottom: 12px; border-left: 4px solid #38bdf8; }
    .feature-title { font-weight: bold; font-size: 14px; color: #f8fafc; margin-bottom: 6px; }
    .feature-desc { font-size: 13px; color: #94a3b8; line-height: 1.6; margin: 0; }
    ul { margin: 6px 0 0 0; padding-left: 18px; color: #cbd5e1; font-size: 13px; line-height: 1.6; }
    li { margin-bottom: 4px; }
    .pdf-box { background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.3); border-radius: 12px; padding: 16px; margin-top: 24px; text-align: center; }
    .pdf-text { font-size: 13px; color: #fbbf24; font-weight: bold; margin: 0; }
    .footer { margin-top: 32px; font-size: 12px; color: #64748b; text-align: center; border-top: 1px solid #1e293b; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">DSA⁴⁰⁴ PLATFORM GUIDE</div>
    <h2>Here is your complete guide to all features and settings in DSA⁴⁰⁴:</h2>

    <h3>1. Settings Tab</h3>
    <div class="feature-item">
      <ul>
        <li>Install PWA application for better experience.</li>
        <li>Adjust your preferences of no of problems you can solve per day i.e., easy, medium, hard. You can restart by choosing the date.</li>
        <li>You can pause the preparation and resume it when you want (if you have exams or other work for long period).</li>
        <li>Notification section: enable Browser notifications and test once to verify receiving notifications.</li>
        <li>Set reminders for every session like morning and evening at a specific time.</li>
        <li>Contest reminders will be sent on that day, before 1hr and 10 mins of contest start.</li>
        <li>Change your name, password, and delete account completely.</li>
      </ul>
    </div>

    <h3>2. Coder Profile Tab</h3>
    <div class="feature-item">
      <div class="feature-title">Public Profile & Coding Handles</div>
      <ul>
        <li>Update your bio, profile pic, goal, and banner.</li>
        <li>After all changes in profile, click on save button.</li>
        <li>Now your profile is live and you can share it with anyone by clicking on share profile.</li>
        <li>Your Shareable Link: <strong style="color: #38bdf8;">/profile/${username || "your_handle"}</strong></li>
        <li>Connect handles for LeetCode, Codeforces, CodeChef, AtCoder, HackerRank, GeeksforGeeks (GFG), and GitHub.</li>
      </ul>
    </div>

    <h3>Built-in Integrations</h3>
    <div class="feature-item">
      <ul>
        <li>⚡ <strong>Solve (AI Tutor)</strong>: Interactive Socratic ChatGPT hints until you understand the pattern or topic unless specified will not give any code.</li>
        <li>▶ <strong>YouTube</strong>: One-click video solutions for the related problem.</li>
        <li>🔍 <strong>Google Search</strong>: Scoped search results across major platforms.</li>
      </ul>
    </div>

    <h3>3. Today's Workspace Tab (Daily Problems & Contests)</h3>
    <div class="feature-item">
      <ul>
        <li>See all topics and problems assigned to you for that day.</li>
        <li>Heatmap shows your progress in terms of days. On click of any day, see problems assigned to you for that day.</li>
        <li>Contest section shows all upcoming contests for that day. Click to go directly to contest page and register.</li>
        <li>Workload adjustment buttons: Postpone, Borrow, Merge, Delete/Skip, Bookmark, Revision Mode.</li>
        <li><strong>Postpone</strong>: Shift unfinished days forward automatically.</li>
        <li><strong>Borrow</strong>: Pull a problem from future days into today.</li>
        <li><strong>Merge</strong>: Combine today's workload with tomorrow.</li>
        <li><strong>Delete / Skip</strong>: Remove or skip days/topics.</li>
        <li><strong>Bookmark (Review Deck)</strong>: Flag problems to revise.</li>
        <li><strong>Revision Mode</strong>: Schedule weekly topic revisions.</li>
        <li>Bottom section: Write notes for that day and revise on Sunday.</li>
      </ul>
    </div>

    <h3>4. Practice Tab</h3>
    <div class="feature-item">
      <ul>
        <li>Practice problems that are not in the roadmap or practice more on a specific topic.</li>
        <li>For every problem, save code, keypoints, and submission link to view anytime (make sure you save correctly for revision later).</li>
      </ul>
    </div>

    <h3>5. Topics Tab & Weeks Tab</h3>
    <div class="feature-item">
      <ul>
        <li>Skip known topics & unskip anytime from Topics tab.</li>
        <li>Week section shows all weeks and topics covered in that week.</li>
        <li>Daily Pace Customizer (Easy, Medium, Hard limits).</li>
      </ul>
    </div>

    <h3>6. Review Tab & Backlog Tab</h3>
    <div class="feature-item">
      <ul>
        <li>In Review tab, see all bookmarked problems to revise.</li>
        <li>Set email reminders for revision of a particular topic and specified date with custom message.</li>
        <li>In Backlog tab, see all missed or unsolved problems or days and revise them.</li>
      </ul>
    </div>

    <h3>7. Progress Tab & Contests Tab</h3>
    <div class="feature-item">
      <ul>
        <li>In Progress tab, see your progress in terms of weeks and topics in heatmap format.</li>
        <li>See days left to complete, earned badges, and total problems solved by topic.</li>
        <li>In Contests tab, see all upcoming contests for that day. Click to go directly to contest page to register.</li>
        <li>If any contest is missed, practice on respective platform in virtual or practice mode.</li>
      </ul>
    </div>

    <div class="pdf-box">
      <p class="pdf-text">💡 Save/Print this guide as a PDF for offline reference anytime!</p>
    </div>

    <div class="footer">
      DSA⁴⁰⁴ · Built for structured, consistent DSA practice
    </div>
  </div>
</body>
</html>`;

    // Send both emails automatically
    console.log(`Sending 2 onboarding emails to ${recipient}...`);
    await sendEmail(recipient, subject1, text1, html1);
    await sendEmail(recipient, subject2, text2, html2);

    return NextResponse.json({ success: true, sentTo: recipient });
  } catch (err: any) {
    console.error("Onboarding emails API error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

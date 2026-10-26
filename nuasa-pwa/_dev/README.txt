Local test rig (not part of the site). Needs node 18+, python3 with playwright and chromium.
 e2e_server.js   serves the real site and runs the real api/project.js with Supabase and Gemini faked
 e2e_run.py      drives the full flow in a browser (open, splash, setup, generate, export)
 test_api.js     handler test;  test_doc.js  sample .docx build;  test_bp.js  sample study plans
Paths inside are set for /home/claude/pjwork, edit them if you run this elsewhere.

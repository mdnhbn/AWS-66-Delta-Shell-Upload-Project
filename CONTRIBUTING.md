# Contributing | অবদান রাখার গাইড

শুধু course-এর লিখিত অনুমতিপ্রাপ্ত domain ও website hostname নথিভুক্ত করুন। Repository public: credentials, URL path, shell URL, payload, exploit instructions, personal data বা sensitive screenshot commit করবেন না। Confidential hostname হলে public repository-তে লিখবেন না।

## Dashboard থেকে

1. Live dashboard-এ **নতুন Entry** খুলুন। Assigned domain (যেমন `example.org`) এবং সেই domain-এর website hostname (যেমন `app.example.org`) লিখুন। `https://`, slash ও path লিখবেন না।
2. Assigned task, চেষ্টা করেছেন কি না, ফলাফল, তারিখ, সংক্ষিপ্ত নিরাপদ details এবং contributor নাম দিন। সফল না হলেও entry করুন। `Attempted=no` হলে `Outcome=not-attempted` দিন।
3. নিজের GitHub ID দিয়ে sign in করে submit করুন। Repository-তে collaborator access লাগে না। Dashboard-এ row এবং GitHub-এর `domains/<domain>/findings.csv` যাচাই করুন। Contributor কলামে আপনার GitHub ID থাকবে; commit-টি সাইটের server-side token-এর মালিকের নামে হবে।

## GitHub browser থেকে

1. Public repository-তে `domains/<domain>/findings.csv` খুলুন। ফাইল না থাকলে fork-এ সেই path-এ **Add file → Create new file** দিয়ে নিচের header লিখুন। Write access না থাকলে GitHub-এর **Edit** থেকে fork তৈরি করুন।
2. Header অনুসারে row যোগ করুন। Comma বা quote থাকলে CSV field double quote-এ রাখুন এবং ভেতরের quote দ্বিগুণ করুন। Domain folder ও `Domain` কলাম একই হতে হবে। Website সেই domain বা subdomain হতে হবে।
3. নিজের fork-এ **Commit changes** করুন, তারপর মূল repository-তে **Pull Request** পাঠান। মালিক PR merge করলে নতুন domain file-ও dashboard-এ আসবে। Write access থাকলে মূল repository-তে commit করাও যায়।

```csv
Domain,Website,Task,Attempted,Outcome,Date,Details,Contributor
example.org,app.example.org,Authorized course check,yes,unsuccessful,2026-09-26,No result during scheduled practice,Your Name
```

`Outcome`: `success`, `unsuccessful`, `in-progress`, `not-attempted`. একই website/task/date/contributor combination আবার যোগ করবেন না। GitHub direct edit-এ API validation চলে না, তাই header, CSV formatting, scope ও নিরাপদ content নিজে যাচাই করুন।

## Command line

```bash
git clone https://github.com/YOUR-USERNAME/AWS-66-Delta-Shell-Upload-Project.git
cd AWS-66-Delta-Shell-Upload-Project
git checkout -b findings/example-org
# Edit or create domains/example.org/findings.csv
git add domains/example.org/findings.csv
git commit -m "[example.org] Record authorized course task"
git push origin findings/example-org
```

প্রথমে GitHub-এ মূল repository-টির **Fork** করুন এবং `YOUR-USERNAME` নিজের GitHub ID দিয়ে বদলান। তারপর মূল repository-তে pull request খুলুন। আগের country-based lab CSV files historical data হিসেবে রাখা হয়েছে।

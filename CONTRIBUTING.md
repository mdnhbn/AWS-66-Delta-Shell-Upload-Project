# Contributing | অবদান রাখার গাইড

এই repository-তে শুধু অনুমোদিত training lab-এর তথ্য যোগ করুন। বাস্তব website URL, admin username/password, shell URL, payload বা sensitive screenshot commit করবেন না।

## Dashboard method | Dashboard থেকে

1. Vercel dashboard খুলুন এবং **নতুন Entry** ট্যাবে যান।
2. Country, opaque Lab ID, finding status, date, contributor এবং সংক্ষিপ্ত safe note দিন।
3. Team lead-এর দেওয়া submission key লিখে Submit করুন। Successful message দেখলে Dashboard refresh করে row যাচাই করুন।

## GitHub browser method | Browser থেকে

1. `domains/[country]/findings.csv` খুলে pencil icon চাপুন।
2. Header অনুসারে একটি CSV row যোগ করুন। Comma বা quote থাকলে field-টি double quotes-এ রাখুন এবং ভেতরের quote দ্বিগুণ করুন।
3. **Commit changes** বা branch + pull request নির্বাচন করুন।

## Command line method

```bash
git clone https://github.com/mdnhbn/AWS-66-Delta-Shell-Upload-Project.git
cd AWS-66-Delta-Shell-Upload-Project
git checkout -b findings/my-lab
# Edit domains/<country>/findings.csv
git add domains/<country>/findings.csv
git commit -m "[country] Document authorized lab finding"
git push origin findings/my-lab
```

Then open a pull request.

CSV header: `Lab ID,Country,Upload Point,Admin Access,Upload Attempted,Upload Result,Date Found,Notes,Contributor`.
Status values: `yes`, `no`, `in-progress`. Keep notes generic and free of exploitable details.

Before commit: check authorization, correct country/date, no duplicate lab ID in that country, no credential or real target, and no sensitive evidence.

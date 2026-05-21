"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { techStackOptions } from "@/lib/tech-stacks";
import { submitSearch, type SearchActionState } from "./actions";

const sourceUrlsByTechStack: Record<string, string[]> = {
  "Machine learning": [
    "https://www.indeed.com/jobs?q=machine+learning&l=United+States&fromage=1&sc=0kf%3Aattr%28DSQF7%29%3B&from=searchOnDesktopSerp&vjk=77a840f046c79cce",
    "https://www.glassdoor.com/Job/united-states-machine-learning-jobs-SRCH_IL.0,13_IN1_KO14,27.htm?fromAge=1&remoteWorkType=1",
    "https://www.monster.com/jobs/search?q=Machine-Learning&where=United-States&page=1&et=REMOTE&recency=today&rd=100&remote=true",
    "https://www.ziprecruiter.com/jobs-search?search=Machine+Learning&location=United+States&radius=25&days=1&refine_by_employment=&refine_by_location_type=only_remote&refine_by_salary=&refine_by_salary_ceil=&refine_by_apply_type=&refine_by_experience_level=&location_types_explicitly_set=true&lk=OosFeVENpM2jTRFnOg1gUg",
    "https://www.dice.com/jobs?filters.postedDate=ONE&filters.workplaceTypes=Remote&q=machine+learning&location=United%20States&filters.workplaceType=Remote&latitude=38.7945952&longitude=-106.5348379&countryCode=US&locationPrecision=Country",
    "https://www.careerbuildercareers.com/en-US/search?keywords=Machine%20Learning&location=United%20States&placeid=ChIJCzYy5IS16lQRQrfeQ5K5Oxw",
    "https://www.simplyhired.com/search?q=machine+learning&l=United+States&fdb=1&sr=100&t=1",
    "https://www.talent.com/jobs?k=machine+learning&l=United+States&workplace=remote&remote=1&radius=100&date=1&id=617061793064294002",
    "https://www.google.com/search?sca_esv=267922cfa28b0bd4&sxsrf=ANbL-n5fKpgApH7ymQLrRTQDSsvavLryGg:1777392241983&q=machine+learning+remote+jobs+past+24+hours+United+States+since+yesterday&uds=ALYpb_kcXKCsiTFZHWq2S-YvFDz9DcVPRM4oGxTDJg0e9CAa7iLtkXRbRUgjgnmcY896rFzJTrI3mHZ52Y2QkzSimRpqBHN_di75OwVFjE5hJYwX620h288mzljQM98h0d0bDosDl2KqJAlE-S-wkaHRr4oee8pZg2bkfpDaEVMgN7GV2j5t8WXMyF_dWLw4nh9oBfrK3PnE2lNTuquDhMI5R6wgRUBBuU7ZgptVmRS1AoqCR75WFoQTDFUQJLoS7zNmgrJYeoiOUdZVbbq-SpG6NUHC5va0iRRpyRP1kP6w2Px4m3xKUOYBhucZbQgvJdytfn7pyt-vOF5TmP8mCTJEnv-SSFcUkjZkUlrgqBgVCQ3HOZP9hwEo2nhk7gwz0JKVBCOiKCl9&sa=X&ved=2ahUKEwjQwNaJ9pCUAxVkL9AFHSB4L6YQkbEKegQIGhAC&jbr=sep:0",
    "https://remoteok.com/remote-jobs-in-united-states&search=machine%20learning",
    "https://www.remoterocketship.com/?page=1&sort=DateAdded&locations=United+States&jobTitle=Machine+Learning+Engineer",
    "https://himalayas.app/jobs/worldwide/machine-learning?type=full-time%2Cpart-time%2Ccontractor",
    "https://remoteleaf.com/jobs/full-time-machine-learning-in-united-states/?min_salary=125000",
    "https://nodesk.co/remote-jobs/?query=Machine%20Learning",
    "https://www.skipthedrive.com/?s=machine%20learning&orderby=date&jobtype=full%20time,contract",
    "https://powertofly.com/jobs/?keywords=Machine+Learning&location_regions=USA",
    "https://wellfound.com/role/l/machine-learning/united-states",
    "https://hired.com/jobs/machine-learning",
    "https://arc.dev/remote-jobs?countryCode=US&jobLevels=senior&jobTypes=fulltime&keyword=Machine%20Learning",
    "https://landing.jobs/jobs?page=1&q=Machine+Learning&fr=true&location=United+States&match=all&country=US&hd=false&t_co=false&t_st=false",
    "https://builtin.com/jobs/remote?search=Machine+Learning&daysSinceUpdated=1&country=USA&allLocations=true",
    "https://www.adzuna.com/search?f=1&loc=151946&remote_only=1&q=machine%20learning",
  ],
  servicenow: [
    "https://www.indeed.com/jobs?q=servicenow&l=United+States&fromage=1&sc=0kf%3Aattr%28DSQF7%29%3B&from=searchOnDesktopSerp&vjk=77a840f046c79cce",
    "https://www.glassdoor.com/Job/united-states-servicenow-jobs-SRCH_IL.0,13_IN1_KO14,27.htm?fromAge=1&remoteWorkType=1",
    "https://www.monster.com/jobs/search?q=ServiceNow&where=United-States&page=1&et=REMOTE&recency=today&rd=100&remote=true",
    "https://www.ziprecruiter.com/jobs-search?search=ServiceNow&location=United+States&radius=25&days=1&refine_by_employment=&refine_by_location_type=only_remote&refine_by_salary=&refine_by_salary_ceil=&refine_by_apply_type=&refine_by_experience_level=&location_types_explicitly_set=true&lk=OosFeVENpM2jTRFnOg1gUg",
    "https://www.dice.com/jobs?filters.postedDate=ONE&filters.workplaceTypes=Remote&q=servicenow&location=United%20States&filters.workplaceType=Remote&latitude=38.7945952&longitude=-106.5348379&countryCode=US&locationPrecision=Country",
    "https://www.careerbuildercareers.com/en-US/search?keywords=ServiceNow&location=United%20States&placeid=ChIJCzYy5IS16lQRQrfeQ5K5Oxw",
    "https://www.simplyhired.com/search?q=servicenow&l=United+States&fdb=1&sr=100&t=1",
    "https://www.talent.com/jobs?k=servicenow&l=United+States&workplace=remote&remote=1&radius=100&date=1&id=617061793064294002",
    "https://www.google.com/search?sca_esv=267922cfa28b0bd4&sxsrf=ANbL-n5fKpgApH7ymQLrRTQDSsvavLryGg:1777392241983&q=servicenow+remote+jobs+past+24+hours+United+States+since+yesterday&uds=ALYpb_kcXKCsiTFZHWq2S-YvFDz9DcVPRM4oGxTDJg0e9CAa7iLtkXRbRUgjgnmcY896rFzJTrI3mHZ52Y2QkzSimRpqBHN_di75OwVFjE5hJYwX620h288mzljQM98h0d0bDosDl2KqJAlE-S-wkaHRr4oee8pZg2bkfpDaEVMgN7GV2j5t8WXMyF_dWLw4nh9oBfrK3PnE2lNTuquDhMI5R6wgRUBBuU7ZgptVmRS1AoqCR75WFoQTDFUQJLoS7zNmgrJYeoiOUdZVbbq-SpG6NUHC5va0iRRpyRP1kP6w2Px4m3xKUOYBhucZbQgvJdytfn7pyt-vOF5TmP8mCTJEnv-SSFcUkjZkUlrgqBgVCQ3HOZP9hwEo2nhk7gwz0JKVBCOiKCl9&sa=X&ved=2ahUKEwjQwNaJ9pCUAxVkL9AFHSB4L6YQkbEKegQIGhAC&jbr=sep:0",
    "https://remoteok.com/remote-jobs-in-united-states&search=servicenow",
    "https://www.remoterocketship.com/?page=1&sort=DateAdded&locations=United+States&jobTitle=ServiceNow",
    "https://himalayas.app/jobs/worldwide/servicenow?type=full-time%2Cpart-time%2Ccontractor",
    "https://remoteleaf.com/jobs/full-time-servicenow-in-united-states/?min_salary=125000",
    "https://nodesk.co/remote-jobs/?query=ServiceNow",
    "https://www.skipthedrive.com/?s=servicenow&orderby=date&jobtype=full%20time,contract",
    "https://powertofly.com/jobs/?keywords=ServiceNow&location_regions=USA",
    "https://hired.com/jobs/servicenow",
    "https://arc.dev/remote-jobs?countryCode=US&jobLevels=senior&jobTypes=fulltime&keyword=ServiceNow",
    "https://landing.jobs/jobs?page=1&q=ServiceNow&fr=true&location=United+States&match=all&country=US&hd=false&t_co=false&t_st=false",
    "https://builtin.com/jobs/remote?search=ServiceNow&daysSinceUpdated=1&country=USA&allLocations=true",
    "https://www.adzuna.com/search?f=1&loc=151946&remote_only=1&q=servicenow",
  ],
  "Data engineer": [
    "https://www.glassdoor.com/Job/united-states-data-engineer-jobs-SRCH_IL.0,13_IN1_KO14,27.htm?fromAge=1&remoteWorkType=1",
    "https://www.monster.com/jobs/search?q=Data-Engineer&where=United-States&page=1&et=REMOTE&recency=today&rd=100&remote=true",
    "https://www.ziprecruiter.com/jobs-search?search=Data+Engineer&location=United+States&radius=25&days=1&refine_by_employment=&refine_by_location_type=only_remote&refine_by_salary=&refine_by_salary_ceil=&refine_by_apply_type=&refine_by_experience_level=&location_types_explicitly_set=true&lk=OosFeVENpM2jTRFnOg1gUg",
    "https://www.dice.com/jobs?filters.postedDate=ONE&filters.workplaceTypes=Remote&q=data+engineer&location=United+States&filters.workplaceType=Remote&latitude=38.7945952&longitude=-106.5348379&countryCode=US&locationPrecision=Country",
    "https://www.careerbuildercareers.com/en-US/search?keywords=Data%20Engineer&location=United%20States&placeid=ChIJCzYy5IS16lQRQrfeQ5K5Oxw",
    "https://www.simplyhired.com/search?q=data+engineer&l=United+States&fdb=1&sr=100&t=1",
    "https://www.talent.com/jobs?k=data+engineer&l=United+States&workplace=remote&remote=1&radius=100&date=1&id=617061793064294002",
    "https://www.google.com/search?sca_esv=267922cfa28b0bd4&sxsrf=ANbL-n5fKpgApH7ymQLrRTQDSsvavLryGg:1777392241983&q=data+engineer+remote+jobs+past+24+hours+United+States+since+yesterday&uds=ALYpb_kcXKCsiTFZHWq2S-YvFDz9DcVPRM4oGxTDJg0e9CAa7iLtkXRbRUgjgnmcY896rFzJTrI3mHZ52Y2QkzSimRpqBHN_di75OwVFjE5hJYwX620h288mzljQM98h0d0bDosDl2KqJAlE-S-wkaHRr4oee8pZg2bkfpDaEVMgN7GV2j5t8WXMyF_dWLw4nh9oBfrK3PnE2lNTuquDhMI5R6wgRUBBuU7ZgptVmRS1AoqCR75WFoQTDFUQJLoS7zNmgrJYeoiOUdZVbbq-SpG6NUHC5va0iRRpyRP1kP6w2Px4m3xKUOYBhucZbQgvJdytfn7pyt-vOF5TmP8mCTJEnv-SSFcUkjZkUlrgqBgVCQ3HOZP9hwEo2nhk7gwz0JKVBCOiKCl9&sa=X&ved=2ahUKEwjQwNaJ9pCUAxVkL9AFHSB4L6YQkbEKegQIGhAC&jbr=sep:0",
    "https://remoteok.com/remote-jobs-in-united-states&search=data%20engineer",
    "https://www.remoterocketship.com/?page=1&sort=DateAdded&locations=United+States&jobTitle=Data+Engineer",
    "https://himalayas.app/jobs/worldwide/data-engineer?type=full-time%2Cpart-time%2Ccontractor",
    "https://remoteleaf.com/jobs/full-time-data-engineer-in-united-states/?min_salary=125000",
    "https://nodesk.co/remote-jobs/?query=Data%20Engineer",
    "https://www.skipthedrive.com/?s=data%20engineer&orderby=date&jobtype=full%20time,contract",
    "https://powertofly.com/jobs/?keywords=Data+Engineer&location_regions=USA",
    "https://wellfound.com/role/l/data-engineer/united-states",
    "https://hired.com/jobs/data-engineer",
    "https://arc.dev/remote-jobs?countryCode=US&jobLevels=senior&jobTypes=fulltime&keyword=Data%20Engineer",
    "https://landing.jobs/jobs?page=1&q=Data+Engineer&fr=true&location=United+States&match=all&country=US&hd=false&t_co=false&t_st=false",
    "https://builtin.com/jobs/remote?search=Data+Engineer&daysSinceUpdated=1&country=USA&allLocations=true",
    "https://www.indeed.com/jobs?q=data+engineer&l=United+States&fromage=1&sc=0kf%3Aattr%28DSQF7%29%3B&from=searchOnDesktopSerp&vjk=77a840f046c79cce",
    "https://www.adzuna.com/search?f=1&loc=151946&remote_only=1&q=data%20engineer",
  ],
  Salesforce: [
    "https://www.linkedin.com/jobs/search/?keywords=Salesforce&location=United%20States&f_TPR=r86400&f_WT=2",
    "https://www.indeed.com/jobs?q=salesforce&l=United+States&fromage=1&sc=0kf%3Aattr%28DSQF7%29%3B&from=searchOnDesktopSerp&vjk=77a840f046c79cce",
    "https://www.glassdoor.com/Job/united-states-salesforce-jobs-SRCH_IL.0,13_IN1_KO14,24.htm?fromAge=1&remoteWorkType=1",
    "https://www.monster.com/jobs/search?q=Salesforce&where=United-States&page=1&et=REMOTE&recency=today&rd=100&remote=true",
    "https://www.ziprecruiter.com/jobs-search?search=Salesforce&location=United+States&radius=25&days=1&refine_by_employment=&refine_by_location_type=only_remote&refine_by_salary=&refine_by_salary_ceil=&refine_by_apply_type=&refine_by_experience_level=&location_types_explicitly_set=true&lk=OosFeVENpM2jTRFnOg1gUg",
    "https://www.dice.com/jobs?filters.postedDate=ONE&filters.workplaceTypes=Remote&q=salesforce&location=United%20States&filters.workplaceType=Remote&latitude=38.7945952&longitude=-106.5348379&countryCode=US&locationPrecision=Country",
    "https://www.careerbuildercareers.com/en-US/search?keywords=Salesforce&location=United%20States&placeid=ChIJCzYy5IS16lQRQrfeQ5K5Oxw",
    "https://www.simplyhired.com/search?q=salesforce&l=United+States&fdb=1&sr=100&t=1",
    "https://www.talent.com/jobs?k=salesforce&l=United+States&workplace=remote&remote=1&radius=100&date=1&id=617061793064294002",
    "https://www.google.com/search?sca_esv=267922cfa28b0bd4&sxsrf=ANbL-n5fKpgApH7ymQLrRTQDSsvavLryGg:1777392241983&q=salesforce+remote+jobs+past+24+hours+United+States+since+yesterday&uds=ALYpb_kcXKCsiTFZHWq2S-YvFDz9DcVPRM4oGxTDJg0e9CAa7iLtkXRbRUgjgnmcY896rFzJTrI3mHZ52Y2QkzSimRpqBHN_di75OwVFjE5hJYwX620h288mzljQM98h0d0bDosDl2KqJAlE-S-wkaHRr4oee8pZg2bkfpDaEVMgN7GV2j5t8WXMyF_dWLw4nh9oBfrK3PnE2lNTuquDhMI5R6wgRUBBuU7ZgptVmRS1AoqCR75WFoQTDFUQJLoS7zNmgrJYeoiOUdZVbbq-SpG6NUHC5va0iRRpyRP1kP6w2Px4m3xKUOYBhucZbQgvJdytfn7pyt-vOF5TmP8mCTJEnv-SSFcUkjZkUlrgqBgVCQ3HOZP9hwEo2nhk7gwz0JKVBCOiKCl9&sa=X&ved=2ahUKEwjQwNaJ9pCUAxVkL9AFHSB4L6YQkbEKegQIGhAC&jbr=sep:0",
    "https://remoteok.com/remote-jobs-in-united-states&search=salesforce",
    "https://www.remoterocketship.com/?page=1&sort=DateAdded&locations=United+States&jobTitle=salesforce",
    "https://himalayas.app/jobs/worldwide/salesforce?type=full-time%2Cpart-time%2Ccontractor",
    "https://remoteleaf.com/jobs/full-time-salesforce-in-united-states/?min_salary=125000",
    "https://nodesk.co/remote-jobs/?query=Salesforce",
    "https://www.skipthedrive.com/?s=salesforce&orderby=date&jobtype=full%20time,contract",
    "https://powertofly.com/jobs/?keywords=Salesforce&location_regions=USA",
    "https://hired.com/jobs/salesforce",
    "https://arc.dev/remote-jobs?countryCode=US&jobLevels=senior&jobTypes=fulltime&keyword=Salesforce",
    "https://landing.jobs/jobs?page=1&q=Salesforce&fr=true&location=United+States&match=all&country=US&hd=false&t_co=false&t_st=false",
    "https://builtin.com/jobs/remote?search=Salesforce&daysSinceUpdated=1&country=USA&allLocations=true",
    "https://www.adzuna.com/search?f=1&loc=151946&remote_only=1&q=salesforce",
  ],
  Mobile: [
    "https://www.linkedin.com/jobs/search/?keywords=Android%20Developer&location=United%20States&f_TPR=r86400&f_WT=2",
    "https://www.indeed.com/jobs?q=android+developer&l=United+States&fromage=1&sc=0kf%3Aattr%28DSQF7%29%3B&from=searchOnDesktopSerp&vjk=77a840f046c79cce",
    "https://www.glassdoor.com/Job/united-states-android-developer-jobs-SRCH_IL.0,13_IN1_KO14,31.htm?fromAge=1&remoteWorkType=1",
    "https://www.monster.com/jobs/search?q=Android-Developer&where=United-States&page=1&et=REMOTE&recency=today&rd=100&remote=true",
    "https://www.ziprecruiter.com/jobs-search?search=Android+Developer&location=United+States&radius=25&days=1&refine_by_employment=&refine_by_location_type=only_remote&refine_by_salary=&refine_by_salary_ceil=&refine_by_apply_type=&refine_by_experience_level=&location_types_explicitly_set=true&lk=OosFeVENpM2jTRFnOg1gUg",
    "https://www.dice.com/jobs?filters.postedDate=ONE&filters.workplaceTypes=Remote&q=android+developer&location=United%20States&filters.workplaceType=Remote&latitude=38.7945952&longitude=-106.5348379&countryCode=US&locationPrecision=Country",
    "https://www.careerbuildercareers.com/en-US/search?keywords=Android%20Developer&location=United%20States&placeid=ChIJCzYy5IS16lQRQrfeQ5K5Oxw",
    "https://www.simplyhired.com/search?q=android+developer&l=United+States&fdb=1&sr=100&t=1",
    "https://www.talent.com/jobs?k=android+developer&l=United+States&workplace=remote&remote=1&radius=100&date=1&id=617061793064294002",
    "https://www.google.com/search?sca_esv=267922cfa28b0bd4&sxsrf=ANbL-n5fKpgApH7ymQLrRTQDSsvavLryGg:1777392241983&q=android+developer+remote+jobs+past+24+hours+United+States+since+yesterday&uds=ALYpb_kcXKCsiTFZHWq2S-YvFDz9DcVPRM4oGxTDJg0e9CAa7iLtkXRbRUgjgnmcY896rFzJTrI3mHZ52Y2QkzSimRpqBHN_di75OwVFjE5hJYwX620h288mzljQM98h0d0bDosDl2KqJAlE-S-wkaHRr4oee8pZg2bkfpDaEVMgN7GV2j5t8WXMyF_dWLw4nh9oBfrK3PnE2lNTuquDhMI5R6wgRUBBuU7ZgptVmRS1AoqCR75WFoQTDFUQJLoS7zNmgrJYeoiOUdZVbbq-SpG6NUHC5va0iRRpyRP1kP6w2Px4m3xKUOYBhucZbQgvJdytfn7pyt-vOF5TmP8mCTJEnv-SSFcUkjZkUlrgqBgVCQ3HOZP9hwEo2nhk7gwz0JKVBCOiKCl9&sa=X&ved=2ahUKEwjQwNaJ9pCUAxVkL9AFHSB4L6YQkbEKegQIGhAC&jbr=sep:0",
    "https://remoteok.com/remote-jobs-in-united-states&search=android%20developer",
    "https://www.remoterocketship.com/?page=1&sort=DateAdded&locations=United+States&jobTitle=Android+Engineer",
    "https://himalayas.app/jobs/worldwide/android-developer?type=full-time%2Cpart-time%2Ccontractor",
    "https://remoteleaf.com/jobs/full-time-android-developer-in-united-states/?min_salary=125000",
    "https://nodesk.co/remote-jobs/?query=Android%20Developer",
    "https://www.skipthedrive.com/?s=android%20developer&orderby=date&jobtype=full%20time,contract",
    "https://powertofly.com/jobs/?keywords=Android+Developer&location_regions=USA",
    "https://builtin.com/jobs/remote?search=Android+Developer&daysSinceUpdated=1&country=USA&allLocations=true",
    "https://wellfound.com/role/l/android-developer/united-states",
    "https://hired.com/jobs/android-developer",
    "https://arc.dev/remote-jobs?countryCode=US&jobLevels=senior&jobTypes=fulltime&keyword=Android%20Developer",
    "https://www.adzuna.com/search?f=1&loc=151946&remote_only=1&q=android%20developer",
  ],
  java: [
    "https://www.linkedin.com/jobs/search/?keywords=Java&location=United%20States&f_TPR=r86400&f_WT=2",
    "https://www.indeed.com/jobs?q=java&l=United+States&fromage=1&sc=0kf%3Aattr%28DSQF7%29%3B&from=searchOnDesktopSerp&vjk=77a840f046c79cce",
    "https://www.glassdoor.com/Job/united-states-java-jobs-SRCH_IL.0,13_IN1_KO14,18.htm?fromAge=1&remoteWorkType=1",
    "https://www.monster.com/jobs/search?q=Java&where=United-States&page=1&et=REMOTE&recency=today&rd=100&remote=true",
    "https://www.ziprecruiter.com/jobs-search?search=Java&location=United+States&radius=25&days=1&refine_by_employment=&refine_by_location_type=only_remote&refine_by_salary=&refine_by_salary_ceil=&refine_by_apply_type=&refine_by_experience_level=&location_types_explicitly_set=true&lk=OosFeVENpM2jTRFnOg1gUg",
    "https://www.dice.com/jobs?filters.postedDate=ONE&filters.workplaceTypes=Remote&q=java&location=United%20States&filters.workplaceType=Remote&latitude=38.7945952&longitude=-106.5348379&countryCode=US&locationPrecision=Country",
    "https://www.careerbuildercareers.com/en-US/search?keywords=Java&location=United%20States&placeid=ChIJCzYy5IS16lQRQrfeQ5K5Oxw",
    "https://www.simplyhired.com/search?q=java&l=United+States&fdb=1&sr=100&t=1",
    "https://www.talent.com/jobs?k=java&l=United+States&workplace=remote&remote=1&radius=100&date=1&id=617061793064294002",
    "https://www.google.com/search?sca_esv=267922cfa28b0bd4&sxsrf=ANbL-n5fKpgApH7ymQLrRTQDSsvavLryGg:1777392241983&q=java+remote+jobs+past+24+hours+United+States+since+yesterday&uds=ALYpb_kcXKCsiTFZHWq2S-YvFDz9DcVPRM4oGxTDJg0e9CAa7iLtkXRbRUgjgnmcY896rFzJTrI3mHZ52Y2QkzSimRpqBHN_di75OwVFjE5hJYwX620h288mzljQM98h0d0bDosDl2KqJAlE-S-wkaHRr4oee8pZg2bkfpDaEVMgN7GV2j5t8WXMyF_dWLw4nh9oBfrK3PnE2lNTuquDhMI5R6wgRUBBuU7ZgptVmRS1AoqCR75WFoQTDFUQJLoS7zNmgrJYeoiOUdZVbbq-SpG6NUHC5va0iRRpyRP1kP6w2Px4m3xKUOYBhucZbQgvJdytfn7pyt-vOF5TmP8mCTJEnv-SSFcUkjZkUlrgqBgVCQ3HOZP9hwEo2nhk7gwz0JKVBCOiKCl9&sa=X&ved=2ahUKEwjQwNaJ9pCUAxVkL9AFHSB4L6YQkbEKegQIGhAC&jbr=sep:0",
    "https://remoteok.com/remote-jobs-in-united-states&search=java",
    "https://www.remoterocketship.com/?page=1&sort=DateAdded&locations=United+States&jobTitle=java",
    "https://himalayas.app/jobs/worldwide/java?type=full-time%2Cpart-time%2Ccontractor",
    "https://remoteleaf.com/jobs/full-time-java-in-united-states/?min_salary=125000",
    "https://nodesk.co/remote-jobs/?query=Java",
    "https://www.skipthedrive.com/?s=java&orderby=date&jobtype=full%20time,contract",
    "https://powertofly.com/jobs/?keywords=Java&location_regions=USA",
    "https://builtin.com/jobs/remote?search=Java&daysSinceUpdated=1&country=USA&allLocations=true",
    "https://wellfound.com/role/l/java/united-states",
    "https://hired.com/jobs/java",
    "https://arc.dev/remote-jobs?countryCode=US&jobLevels=senior&jobTypes=fulltime&keyword=Java",
    "https://landing.jobs/jobs?page=1&q=Java&fr=true&location=United+States&match=all&country=US&hd=false&t_co=false&t_st=false",
    "https://www.adzuna.com/search?f=1&loc=151946&remote_only=1&q=java",
  ],
  "Dynamics 365": [
    "https://www.linkedin.com/jobs/search/?keywords=Dynamics%20365&location=United%20States&f_TPR=r86400&f_WT=2",
    "https://www.indeed.com/jobs?q=dynamics+365&l=United+States&fromage=1&sc=0kf%3Aattr%28DSQF7%29%3B&from=searchOnDesktopSerp&vjk=77a840f046c79cce",
    "https://www.glassdoor.com/Job/united-states-dynamics-365-jobs-SRCH_IL.0,13_IN1_KO14,26.htm?fromAge=1&remoteWorkType=1",
    "https://www.monster.com/jobs/search?q=Dynamics-365&where=United-States&page=1&et=REMOTE&recency=today&rd=100&remote=true",
    "https://www.ziprecruiter.com/jobs-search?search=Dynamics+365&location=United+States&radius=25&days=1&refine_by_employment=&refine_by_location_type=only_remote&refine_by_salary=&refine_by_salary_ceil=&refine_by_apply_type=&refine_by_experience_level=&location_types_explicitly_set=true&lk=OosFeVENpM2jTRFnOg1gUg",
    "https://www.dice.com/jobs?filters.postedDate=ONE&filters.workplaceTypes=Remote&q=dynamics+365&location=United%20States&filters.workplaceType=Remote&latitude=38.7945952&longitude=-106.5348379&countryCode=US&locationPrecision=Country",
    "https://www.careerbuildercareers.com/en-US/search?keywords=Dynamics%20365&location=United%20States&placeid=ChIJCzYy5IS16lQRQrfeQ5K5Oxw",
    "https://www.simplyhired.com/search?q=dynamics+365&l=United+States&fdb=1&sr=100&t=1",
    "https://www.talent.com/jobs?k=dynamics+365&l=United+States&workplace=remote&remote=1&radius=100&date=1&id=617061793064294002",
    "https://www.google.com/search?sca_esv=267922cfa28b0bd4&sxsrf=ANbL-n5fKpgApH7ymQLrRTQDSsvavLryGg:1777392241983&q=dynamics+365+remote+jobs+past+24+hours+United+States+since+yesterday&uds=ALYpb_kcXKCsiTFZHWq2S-YvFDz9DcVPRM4oGxTDJg0e9CAa7iLtkXRbRUgjgnmcY896rFzJTrI3mHZ52Y2QkzSimRpqBHN_di75OwVFjE5hJYwX620h288mzljQM98h0d0bDosDl2KqJAlE-S-wkaHRr4oee8pZg2bkfpDaEVMgN7GV2j5t8WXMyF_dWLw4nh9oBfrK3PnE2lNTuquDhMI5R6wgRUBBuU7ZgptVmRS1AoqCR75WFoQTDFUQJLoS7zNmgrJYeoiOUdZVbbq-SpG6NUHC5va0iRRpyRP1kP6w2Px4m3xKUOYBhucZbQgvJdytfn7pyt-vOF5TmP8mCTJEnv-SSFcUkjZkUlrgqBgVCQ3HOZP9hwEo2nhk7gwz0JKVBCOiKCl9&sa=X&ved=2ahUKEwjQwNaJ9pCUAxVkL9AFHSB4L6YQkbEKegQIGhAC&jbr=sep:0",
    "https://www.remoterocketship.com/?page=1&sort=DateAdded&locations=United+States&jobTitle=dynamics+365",
    "https://himalayas.app/jobs/worldwide/dynamics-365?type=full-time%2Cpart-time%2Ccontractor",
    "https://remoteleaf.com/jobs/full-time-dynamics-365-in-united-states/?min_salary=125000",
    "https://nodesk.co/remote-jobs/?query=Dynamics%20365",
    "https://www.skipthedrive.com/?s=dynamics%20365&orderby=date&jobtype=full%20time,contract",
    "https://powertofly.com/jobs/?keywords=Dynamics+365&location_regions=USA",
    "https://builtin.com/jobs/remote?search=Dynamics+365&daysSinceUpdated=1&country=USA&allLocations=true",
    "https://wellfound.com/role/l/dynamics-365/united-states",
    "https://hired.com/jobs/dynamics-365",
    "https://arc.dev/remote-jobs?countryCode=US&jobLevels=senior&jobTypes=fulltime&keyword=Dynamics%20365",
    "https://landing.jobs/jobs?page=1&q=Dynamics+365&fr=true&location=United+States&match=all&country=US&hd=false&t_co=false&t_st=false",
    "https://www.adzuna.com/search?f=1&loc=151946&remote_only=1&q=dynamics%20365",
    "https://www.linkedin.com/jobs/search/?keywords=Power%20Platform&location=United%20States&f_TPR=r86400&f_WT=2",
    "https://www.indeed.com/jobs?q=power+platform&l=United+States&fromage=1&sc=0kf%3Aattr%28DSQF7%29%3B&from=searchOnDesktopSerp&vjk=77a840f046c79cce",
    "https://www.glassdoor.com/Job/united-states-power-platform-jobs-SRCH_IL.0,13_IN1_KO14,28.htm?fromAge=1&remoteWorkType=1",
    "https://www.monster.com/jobs/search?q=Power-Platform&where=United-States&page=1&et=REMOTE&recency=today&rd=100&remote=true",
    "https://www.ziprecruiter.com/jobs-search?search=Power+Platform&location=United+States&radius=25&days=1&refine_by_employment=&refine_by_location_type=only_remote&refine_by_salary=&refine_by_salary_ceil=&refine_by_apply_type=&refine_by_experience_level=&location_types_explicitly_set=true&lk=OosFeVENpM2jTRFnOg1gUg",
    "https://www.dice.com/jobs?filters.postedDate=ONE&filters.workplaceTypes=Remote&q=power+platform&location=United%20States&filters.workplaceType=Remote&latitude=38.7945952&longitude=-106.5348379&countryCode=US&locationPrecision=Country",
    "https://www.careerbuildercareers.com/en-US/search?keywords=Power%20Platform&location=United%20States&placeid=ChIJCzYy5IS16lQRQrfeQ5K5Oxw",
    "https://www.simplyhired.com/search?q=power+platform&l=United+States&fdb=1&sr=100&t=1",
    "https://www.talent.com/jobs?k=power+platform&l=United+States&workplace=remote&remote=1&radius=100&date=1&id=617061793064294002",
    "https://www.google.com/search?sca_esv=267922cfa28b0bd4&sxsrf=ANbL-n5fKpgApH7ymQLrRTQDSsvavLryGg:1777392241983&q=power+platform+remote+jobs+past+24+hours+United+States+since+yesterday&uds=ALYpb_kcXKCsiTFZHWq2S-YvFDz9DcVPRM4oGxTDJg0e9CAa7iLtkXRbRUgjgnmcY896rFzJTrI3mHZ52Y2QkzSimRpqBHN_di75OwVFjE5hJYwX620h288mzljQM98h0d0bDosDl2KqJAlE-S-wkaHRr4oee8pZg2bkfpDaEVMgN7GV2j5t8WXMyF_dWLw4nh9oBfrK3PnE2lNTuquDhMI5R6wgRUBBuU7ZgptVmRS1AoqCR75WFoQTDFUQJLoS7zNmgrJYeoiOUdZVbbq-SpG6NUHC5va0iRRpyRP1kP6w2Px4m3xKUOYBhucZbQgvJdytfn7pyt-vOF5TmP8mCTJEnv-SSFcUkjZkUlrgqBgVCQ3HOZP9hwEo2nhk7gwz0JKVBCOiKCl9&sa=X&ved=2ahUKEwjQwNaJ9pCUAxVkL9AFHSB4L6YQkbEKegQIGhAC&jbr=sep:0",
    "https://www.remoterocketship.com/?page=1&sort=DateAdded&locations=United+States&jobTitle=power+platform",
    "https://himalayas.app/jobs/worldwide/power-platform?type=full-time%2Cpart-time%2Ccontractor",
    "https://remoteleaf.com/jobs/full-time-power-platform-in-united-states/?min_salary=125000",
    "https://nodesk.co/remote-jobs/?query=Power%20Platform",
    "https://www.skipthedrive.com/?s=power%20platform&orderby=date&jobtype=full%20time,contract",
    "https://powertofly.com/jobs/?keywords=Power+Platform&location_regions=USA",
    "https://builtin.com/jobs/remote?search=Power+Platform&daysSinceUpdated=1&country=USA&allLocations=true",
    "https://wellfound.com/role/l/power-platform/united-states",
    "https://hired.com/jobs/power-platform",
    "https://arc.dev/remote-jobs?countryCode=US&jobLevels=senior&jobTypes=fulltime&keyword=Power%20Platform",
    "https://www.adzuna.com/search?f=1&loc=151946&remote_only=1&q=power%20platform",
  ],
  mern: [
    "https://www.indeed.com/jobs?q=mern&l=United+States&fromage=1&sc=0kf%3Aattr%28DSQF7%29%3B&from=searchOnDesktopSerp&vjk=77a840f046c79cce",
    "https://www.glassdoor.com/Job/united-states-mern-jobs-SRCH_IL.0,13_IN1_KO14,18.htm?fromAge=1&remoteWorkType=1",
    "https://www.monster.com/jobs/search?q=MERN&where=United-States&page=1&et=REMOTE&recency=today&rd=100&remote=true",
    "https://www.ziprecruiter.com/jobs-search?search=MERN&location=United+States&radius=25&days=1&refine_by_employment=&refine_by_location_type=only_remote&refine_by_salary=&refine_by_salary_ceil=&refine_by_apply_type=&refine_by_experience_level=&location_types_explicitly_set=true&lk=OosFeVENpM2jTRFnOg1gUg",
    "https://www.dice.com/jobs?filters.postedDate=ONE&filters.workplaceTypes=Remote&q=mern&location=United%20States&filters.workplaceType=Remote&latitude=38.7945952&longitude=-106.5348379&countryCode=US&locationPrecision=Country",
    "https://www.careerbuildercareers.com/en-US/search?keywords=MERN&location=United%20States&placeid=ChIJCzYy5IS16lQRQrfeQ5K5Oxw",
    "https://www.simplyhired.com/search?q=mern&l=United+States&fdb=1&sr=100&t=1",
    "https://www.talent.com/jobs?k=mern&l=United+States&workplace=remote&remote=1&radius=100&date=1&id=617061793064294002",
    "https://www.google.com/search?sca_esv=267922cfa28b0bd4&sxsrf=ANbL-n5fKpgApH7ymQLrRTQDSsvavLryGg:1777392241983&q=mern+remote+jobs+past+24+hours+United+States+since+yesterday&uds=ALYpb_kcXKCsiTFZHWq2S-YvFDz9DcVPRM4oGxTDJg0e9CAa7iLtkXRbRUgjgnmcY896rFzJTrI3mHZ52Y2QkzSimRpqBHN_di75OwVFjE5hJYwX620h288mzljQM98h0d0bDosDl2KqJAlE-S-wkaHRr4oee8pZg2bkfpDaEVMgN7GV2j5t8WXMyF_dWLw4nh9oBfrK3PnE2lNTuquDhMI5R6wgRUBBuU7ZgptVmRS1AoqCR75WFoQTDFUQJLoS7zNmgrJYeoiOUdZVbbq-SpG6NUHC5va0iRRpyRP1kP6w2Px4m3xKUOYBhucZbQgvJdytfn7pyt-vOF5TmP8mCTJEnv-SSFcUkjZkUlrgqBgVCQ3HOZP9hwEo2nhk7gwz0JKVBCOiKCl9&sa=X&ved=2ahUKEwjQwNaJ9pCUAxVkL9AFHSB4L6YQkbEKegQIGhAC&jbr=sep:0",
    "https://himalayas.app/jobs/worldwide/mern?type=full-time%2Cpart-time%2Ccontractor",
    "https://remoteleaf.com/jobs/full-time-mern-in-united-states/?min_salary=125000",
    "https://nodesk.co/remote-jobs/?query=MERN",
    "https://www.skipthedrive.com/?s=mern&orderby=date&jobtype=full%20time,contract",
    "https://powertofly.com/jobs/?keywords=MERN&location_regions=USA",
    "https://wellfound.com/role/l/mern/united-states",
    "https://hired.com/jobs/mern",
    "https://arc.dev/remote-jobs?countryCode=US&jobLevels=senior&jobTypes=fulltime&keyword=MERN",
    "https://landing.jobs/jobs?page=1&q=MERN&fr=true&location=United+States&match=all&country=US&hd=false&t_co=false&t_st=false",
    "https://builtin.com/jobs/remote?search=MERN&daysSinceUpdated=1&country=USA&allLocations=true",
    "https://www.adzuna.com/search?f=1&loc=151946&remote_only=1&q=mern",
    "https://www.remoterocketship.com/?page=1&sort=DateAdded&locations=United+States&jobTitle=mern",
  ],
};

const getSourceUrls = (techStack: string) => sourceUrlsByTechStack[techStack]?.join("\n") ?? "";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      <Send className="h-4 w-4" />
      {pending ? "Starting pipeline..." : "Submit search"}
    </Button>
  );
}

export function SearchForm() {
  const [state, action] = useActionState<SearchActionState, FormData>(submitSearch, {});
  const [techStack, setTechStack] = useState(techStackOptions[0].value);
  const [sourceUrls, setSourceUrls] = useState(() => getSourceUrls(techStackOptions[0].value));

  function handleTechStackChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const selectedTechStack = event.target.value;

    setTechStack(selectedTechStack);
    setSourceUrls(getSourceUrls(selectedTechStack));
  }

  return (
    <form action={action} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-5 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-ink">Tech stack</span>
          <Select
            name="tech_stack"
            options={techStackOptions}
            value={techStack}
            onChange={handleTechStackChange}
            required
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-ink">Keyword</span>
          <Input name="keyword" placeholder="Frontend engineer, AI engineer, platform" required />
        </label>
        <label className="block md:col-span-2">
          <span className="mb-2 block text-sm font-semibold text-ink">Source URLs</span>
          <Textarea
            name="source_urls"
            value={sourceUrls}
            onChange={(event) => setSourceUrls(event.target.value)}
            placeholder={"https://www.linkedin.com/jobs/search/...\nhttps://wellfound.com/jobs\nhttps://remoteok.com"}
            wrap="off"
            spellCheck={false}
            className="overflow-x-auto whitespace-pre font-mono"
            required
          />
        </label>
      </div>
      {state.error ? (
        <div className="mt-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {state.error}
        </div>
      ) : null}
      <div className="mt-6 flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}

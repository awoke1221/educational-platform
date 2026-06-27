SELECT "fullName", "locationType", "attendanceMode", "phoneNumber", "email"
FROM commingsoon_users 
WHERE "fullName" LIKE 'Test %'
ORDER BY "submittedAt";

SELECT "fullName", "locationType", "attendanceMode", "phoneNumber", "email", "country"
FROM commingsoon_users 
WHERE "fullName" LIKE 'Test %'
ORDER BY "submittedAt";

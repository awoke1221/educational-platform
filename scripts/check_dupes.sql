SELECT "fullName", "phoneNumber", "locationType", "attendanceMode" 
FROM commingsoon_users 
WHERE "phoneNumber" = '+251911111003' 
   OR "phoneNumber" = '+251911111001'
   OR "phoneNumber" = '+251911111002';

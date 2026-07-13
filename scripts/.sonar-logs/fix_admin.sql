UPDATE users SET crypted_password='$2a$12$m4u0mBKHZY0bssAdJ8dqE.cE5i1bLacpHUbH3aa76O65iwhQAw7ou', salt=NULL, hash_method='BCRYPT', reset_password=false, active=true WHERE login='admin';

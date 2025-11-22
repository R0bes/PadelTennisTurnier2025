-- CreateTable
CREATE TABLE \
Tournament\ (
    \id\ TEXT NOT NULL PRIMARY KEY,
    \name\ TEXT NOT NULL,
    \phase\ TEXT NOT NULL DEFAULT 'registration',
    \createdAt\ DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE \Player\ (
    \id\ TEXT NOT NULL PRIMARY KEY,
    \name\ TEXT NOT NULL,
    \tournamentId\ TEXT NOT NULL,
    CONSTRAINT \Player_tournamentId_fkey\ FOREIGN KEY (\tournamentId\) REFERENCES \Tournament\ (\id\) ON DELETE RESTRICT ON UPDATE CASCADE
);

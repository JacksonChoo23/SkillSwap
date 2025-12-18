# SkillSwap - Academic UML Class Diagram

## Overview

This diagram represents the core domain model for SkillSwap, a peer-to-peer skill exchange platform. It focuses on **domain entities** and **business services**, excluding UI, controllers, and configuration layers.

---

## UML Class Diagram Structure

### Domain Entities

| Class | Key Attributes | Key Operations |
|-------|----------------|----------------|
| **User** | id, name, email, role, isVerified | verifyEmail(), suspend(), ban() |
| **Skill** | id, name, categoryId | validate(), getCategory() |
| **Category** | id, name, isActive | activate(), deactivate() |
| **Listing** | id, title, description, status, visibility | publish(), pause(), close() |
| **LearningSession** | id, startAt, endAt, status, startCode | confirm(), start(), complete(), cancel() |
| **Rating** | id, communication, skill, attitude, comment | calculateAverage() |
| **Message** | id, content, createdAt | validate(), markAsRead() |
| **MessageThread** | id, listingId, createdAt | addMessage(), getMessages() |
| **Report** | id, reason, aiVerdict, severity, status | escalate(), resolve(), dismiss() |
| **Transaction** | id, amount, currency, status | process(), refund() |
| **TipToken** | id, amount, note | send(), validate() |

### Core Business Services

| Service | Key Methods |
|---------|-------------|
| **MatchingService** | findMatches(), calculateScore() |
| **ModerationService** | validateContent(), analyzeReport() |
| **PenaltyService** | applyPenalty(), getPenaltyDisplay() |

---

## Associations & Multiplicity

```
User "1" ────────< "0..*" Listing          : owns
User "1" ────────< "0..*" LearningSession  : teaches (as teacher)
User "1" ────────< "0..*" LearningSession  : attends (as student)
User "1" ────────< "0..*" Rating           : gives (as rater)
User "1" ────────< "0..*" Rating           : receives (as ratee)
User "1" ────────< "0..*" Report           : submits (as reporter)
User "1" ────────< "0..*" Report           : is reported (as target)
User "1" ────────< "0..*" Transaction      : owns
User "1" ────────< "0..*" TipToken         : sends
User "1" ────────< "0..*" TipToken         : receives

Listing "1" ────────< "0..*" MessageThread : discusses
Listing "1" ────── "1" Skill              : offers
Listing "0..1" ────── "1" Skill           : requests (learnSkill)

Skill "0..*" ────── "1" Category          : belongs to

LearningSession "1" ────── "1" Skill      : covers
LearningSession "1" ────────< "0..2" Rating : has

MessageThread "1" ────────< "1..*" Message : contains
Message "1" ────── "1" User               : sender
```

---

## PlantUML Code

```plantuml
@startuml SkillSwap_Class_Diagram

skinparam classAttributeIconSize 0
skinparam class {
    BackgroundColor White
    BorderColor Black
    ArrowColor Black
}

' ========== Domain Entities ==========

class User {
    - id : Integer
    - name : String
    - email : String
    - role : Enum
    - isVerified : Boolean
    --
    + verifyEmail() : void
    + suspend(in reason : String) : void
    + ban() : void
}

class Skill {
    - id : Integer
    - name : String
    - categoryId : Integer
    --
    + validate() : Boolean
    + getCategory() : Category
}

class Category {
    - id : Integer
    - name : String
    - isActive : Boolean
    --
    + activate() : void
    + deactivate() : void
}

class Listing {
    - id : Integer
    - title : String
    - description : String
    - status : Enum
    - visibility : Enum
    --
    + publish() : void
    + pause() : void
    + close() : void
}

class LearningSession {
    - id : Integer
    - startAt : DateTime
    - endAt : DateTime
    - status : Enum
    - startCode : String
    --
    + confirm() : void
    + generateCode() : String
    + start(in code : String) : Boolean
    + complete() : void
    + cancel() : void
}

class Rating {
    - id : Integer
    - communication : Integer
    - skill : Integer
    - attitude : Integer
    - comment : String
    --
    + calculateAverage() : Float
}

class Message {
    - id : Integer
    - content : String
    - createdAt : DateTime
    --
    + validate() : Boolean
    + markAsRead() : void
}

class MessageThread {
    - id : Integer
    - listingId : Integer
    - createdAt : DateTime
    --
    + addMessage(in content : String) : Message
    + getMessages() : List
}

class Report {
    - id : Integer
    - reason : String
    - aiVerdict : Enum
    - severity : Enum
    - status : Enum
    --
    + escalate() : void
    + resolve() : void
    + dismiss() : void
}

class Transaction {
    - id : Integer
    - amount : Decimal
    - currency : String
    - status : Enum
    --
    + process() : Boolean
    + refund() : Boolean
}

class TipToken {
    - id : Integer
    - amount : Integer
    - note : String
    --
    + send() : Boolean
    + validate() : Boolean
}

' ========== Core Business Services ==========

class MatchingService <<service>> {
    + findMatches(in userId : Integer) : List
    + calculateScore(in user1 : User, in user2 : User) : Float
}

class ModerationService <<service>> {
    + validateContent(in text : String) : Boolean
    + analyzeReport(in reportId : Integer) : JSON
}

class PenaltyService <<service>> {
    + applyPenalty(in userId : Integer, in severity : Enum) : void
    + getPenaltyDisplay(in severity : Enum) : String
}

' ========== Associations ==========

User "1" --> "0..*" Listing : owns
User "1" --> "0..*" LearningSession : teaches
User "1" --> "0..*" LearningSession : attends
User "1" --> "0..*" Rating : gives
User "1" --> "0..*" Rating : receives
User "1" --> "0..*" Report : submits
User "1" --> "0..*" Report : is target of
User "1" --> "0..*" Transaction : owns
User "1" --> "0..*" TipToken : sends
User "1" --> "0..*" TipToken : receives

Listing "1" --> "0..*" MessageThread : has
Listing "1" --> "1" Skill : offers
Listing "0..1" --> "1" Skill : requests

Skill "*" --> "1" Category : belongs to

LearningSession "1" --> "1" Skill : covers
LearningSession "1" --> "0..2" Rating : has

MessageThread "1" --> "1..*" Message : contains
Message "*" --> "1" User : sent by

' ========== Service Dependencies ==========

MatchingService ..> User : uses
MatchingService ..> Skill : uses
ModerationService ..> Report : uses
PenaltyService ..> User : modifies

@enduml
```

---

## Notes

- All attributes use `-` (private) visibility
- All operations use `+` (public) visibility
- Operations include `in` parameter directionality where applicable
- Separator `--` is used to divide attributes from operations in PlantUML
- Multiplicity follows UML standard: `1`, `0..1`, `0..*`, `1..*`

import fs from "node:fs";
import {createTicket} from "./ticket.js";

fs.writeFileSync("ticket.txt", "My first ticket handling file");
// fs.writeFileSync("ticket.txt","Heard i dont need to append to change file content");

fs.appendFileSync("ticket.txt", "\nAnother ticket: Payment failed");
// this appends to create a file or add content to the file without overwriting the existing content using "\n".

const data = fs.readFileSync("ticket.txt", "utf-8");
// we read a file using readFileSync and store the content in a variable called data. The second argument "utf-8" is used to specify the encoding of the file content, which is important for correctly interpreting the text data.
console.log(data);

const ticket = fs.readFileSync("ticket.txt");
console.log(ticket.toString());

try{
     const tickets = fs.readFileSync("missing.txt", "utf-8");

// console.log(ticket.toString());
     console.log(tickets);
} catch(error) {
     console.log("Error reading file:", error.message);
}
console.log("This is the end of the file");




const result = createTicket("Payment failed");

console.log(result);
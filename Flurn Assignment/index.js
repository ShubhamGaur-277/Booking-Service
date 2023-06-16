const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const fs = require("fs");

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
mongoose.connect("mongodb://0.0.0.0:27017/BookingService");

/* `const seatSchema` is defining the schema for the `Seats` collection in the MongoDB database. It
specifies the fields that each document in the collection will have, including `id`,
`seat_identifier`, `seat_class`, and `is_booked`. The `id` field is a number, `seat_identifier` and
`seat_class` are strings, and `is_booked` is a boolean with a default value of `false`. This schema
will be used to create a model for the `Seats` collection in the database. */
const seatSchema = new mongoose.Schema({
  id: Number,
  seat_identifier: String,
  seat_class: String,
  is_booked: { type: Boolean, default: false },
});
/* `const seatPrice` is defining the schema for the `SeatPrice` collection in the MongoDB database. It
specifies the fields that each document in the collection will have, including `id`, `seat_class`,
`min_price`, `normal_price`, and `max_price`. This schema will be used to create a model for the
`SeatPrice` collection in the database. */
const seatPrice = new mongoose.Schema({
  id: Number,
  seat_class: String,
  min_price: String,
  normal_price: String,
  max_price: String,
});

const bookingDetails = new mongoose.Schema({
  name:String,
  phone:Number,
  bookingId:String
})

/* `const Seat` and `const SeatPrice` are creating models for the `Seats` and `SeatPrice` collections
in the MongoDB database respectively. The `mongoose.model()` method takes two arguments: the name of
the collection and the schema that defines the structure of the documents in the collection. These
models can be used to perform CRUD (Create, Read, Update, Delete) operations on the corresponding
collections in the database. */
const Seat = mongoose.model("Seats", seatSchema);
const SeatPrice = mongoose.model("SeatPrice", seatPrice);
const BookingDetails = mongoose.model("BookingDetails",bookingDetails);

/* `const data = JSON.parse(fs.readFileSync('data/seat price.json', 'utf-8'));` is reading the contents
of the 'seat price.json' file and parsing it as a JSON object. The `fs.readFileSync()` method is
used to read the file synchronously, and the `JSON.parse()` method is used to parse the contents of
the file as a JSON object. The resulting JSON object is stored in the `data` variable. */
const data = JSON.parse(fs.readFileSync("data/seat price.json", "utf-8"));

/**
 * This function imports data into a SeatPrice model and logs a success message or an error message.
 */
const importData = async () => {
  try {
    await SeatPrice.create(data);
    console.log("data successfully imported");
    // to exit the process
    process.exit();
  } catch (error) {
    console.log("error", error);
  }
};

/* This code is defining a route for the URL `/seats` on the server. When a GET request is made to this
URL, the code queries the `Seats` collection in the MongoDB database using the `Seat.find()` method,
sorts the results by `seat_class` and `id` in ascending order using the `sort()` method, and sends
the resulting array of documents as a response using the `res.send()` method. */
app.get("/seats", (req, res) => {
  Seat.find()
    .sort({ seat_class: 1, id: 1 })
    .then((users) => {
      res.send(users);
    });
});

/* The `async function priceCalculation(id){` is a function that takes an `id` parameter and calculates
the price of a seat based on the percentage of seats that are booked in the same `seat_class` as the
requested seat. It first queries the `Seats` collection in the MongoDB database to find the
`seat_class` of the requested seat. It then calculates the percentage of seats that are booked in
the same `seat_class` using the `Seat.countDocuments()` method. Based on the percentage, it
determines the price of the seat by checking the `SeatPrice` collection in the MongoDB database for
the corresponding `seat_class`. Finally, it returns an object containing the seat details and the
calculated price. */
async function priceCalculation(id){
  let percentage = 0;
  const seatclass = await Seat.find({ id: id });
  Seat.countDocuments({ seat_class: seatclass[0].seat_class }).then(
    (totalSeats) => {
      Seat.countDocuments({
        seat_class: seatclass[0].seat_class,
        is_booked: true,
      }).then((seatsBooked) => {
        percentage = (seatsBooked / totalSeats) * 100;
      });
    }
  );
  const sp = await SeatPrice.find({ seat_class: seatclass[0].seat_class });
  const priceData = sp[0];
  const seatClassData = seatclass[0]._doc;
  /* This code block is determining the price of a seat based on the percentage of seats that are
    booked in the same `seat_class` as the requested seat. If the percentage is less than 40%, the
    code checks if a minimum price is specified in the `data` object. If it is, the seat is priced
    at the minimum price specified in the `SeatPrice` collection for the corresponding `seat_class`.
    If not, the seat is priced at the normal price specified in the `SeatPrice` collection. If the
    percentage is between 40% and 60%, the code checks if a normal price is specified in the `data`
    object. If it is, the seat is priced at the normal price specified in the `SeatPrice`
    collection. If not, the seat is priced at the maximum price specified in the `SeatPrice`
    collection. If the percentage is greater than 60%, the code checks if a maximum price is
    specified in the `data` object. If it is, the seat is priced at the maximum price specified in
    the `SeatPrice` collection for the corresponding `seat_class`. If not, the seat is priced at the
    normal price specified in the `Seat */
  if (percentage < 40) {
    if (priceData.min_price != '') {
      let priced = priceData.min_price;
      Object.assign(seatClassData, { price: priced });
      return seatClassData;
    } else {
      let priced = priceData.normal_price;
      Object.assign(seatClassData, { price: priced });
      return seatClassData;
    }
  } else if (percentage >= 40 && percentage <= 60) {
    if (priceData.normal_price != '') {
      let priced = priceData.normal_price;
      Object.assign(seatClassData, { price: priced });
      return seatClassData;
    } else {
      let priced = priceData.max_price;
      Object.assign(seatClassData, { price: priced });
      return seatClassData;
    }
  } else {
    if (priceData.max_price != '') {
      let priced = priceData.max_price;
      Object.assign(seatClassData, { price: priced });
      return seatClassData;
    } else {
      let priced = priceData.normal_price;
      Object.assign(seatClassData, { price: priced });
      return seatClassData;
    }
  }
}


/* This code is defining a route for the URL `/seats/:id` on the server. When a GET request is made to
this URL with a specific `id` parameter, the code calls the `priceCalculation()` function with the
`id` parameter as an argument. The `priceCalculation()` function calculates the price of the seat
based on the percentage of seats that are booked in the same `seat_class` as the requested seat, and
returns an object containing the seat details and the calculated price. The resulting object is then
sent as a response using the `res.send()` method. */
app.get("/seats/:id", async (req, res) => {
  id = req.params.id;
  const result = await priceCalculation(id)
  res.send(result);
});

app.post("/booking", async (req, res) => {
  let bookings = []
  function generateBookingId() {
    return Math.random().toString(36).substr(2, 9);
  }
  // Extract data from request body
  const bookingRequests = req.body;
  let count = bookingRequests.length;
  let counter= 0;
  bookingRequests.forEach(async (user) => {
    const seatId = user.seatId;
    const userName = user.name;
    const contactNumber = user.number;
    await Seat.find({ id: seatId }).then(async (result) => {
      console.log(result);
      if (result[0].is_booked) {
        return res
          .status(400)
          .json({ error: `seat with seatId ${seatId} is already booked` });
      } else {
       await Seat.findOneAndUpdate({id: seatId},{is_booked:true},{new:true})
        const bookingId = generateBookingId();
        const priceDetails = await priceCalculation(seatId);
        var seatbooking = new BookingDetails({
          name:userName,
          phone:contactNumber,
          bookingId:bookingId
        });
        await seatbooking.save();
        let result = {
          bookingId:bookingId,
          price:priceDetails.price
        }
        bookings.push(result)
        console.log(bookings);
        counter++;
        if(counter === count){
          res.send(bookings)
        }
      }
    });
  });

});

app.get('/bookings', async (req, res) => {
  const userIdentifier = req.query;
  console.log(req.query);
  // Check if userIdentifier is provided
  if (!userIdentifier) {
    return res.status(400).json({ error: 'No user identifier provided.' });
  }

  try {
    // Search for bookings by email or phone number
    const bookings = await BookingDetails.find({ $or: [{ name: userIdentifier.name }, { phone: userIdentifier.phone }] });

    return res.json(bookings);
  } catch (error) {
    console.error('Error retrieving bookings:', error);
    return res.status(500).json({ error: 'An error occurred while retrieving the bookings.' });
  }
});

app.listen("3000", (req, res) => {
  console.log("http://localhost:3000");
});

/**
 * Created by rodrigoburg on 23/03/15.
 */

// Various accessors that specify the four dimensions of data to visualize.
function x(d) { return d.variancia; }
function y(d) { return d.governismo; }
function radius(d) { return d.num_deputados; }
function color(d) { return d.name; }
function key(d) { return d.name; }

// Chart dimensions.
var margin = {top: 19.5, right: 19.5, bottom: 19.5, left: 39.5},
    width = 960 - margin.right,
    height = 500 - margin.top - margin.bottom;

// Various scales. These domains make assumptions of data, naturally.
var xScale = d3.scale.linear().domain([0, 30]).range([50, width]),
    yScale = d3.scale.linear().domain([20, 100]).range([height, 0]),
    radiusScale = d3.scale.sqrt().domain([1, 100]).range([0, 50]),
    colorScale = d3.scale.category10();

// The x & y axes.
var xAxis = d3.svg.axis().orient("bottom").scale(xScale),
    yAxis = d3.svg.axis().scale(yScale).orient("left");

// Create the SVG container and set the origin.
var svg = d3.select("#chart").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// tradução do mês
var traducao_mes = {
    "jan":"01",
    "fev":"02",
    "mar":"03",
    "abr":"04",
    "mai":"05",
    "jun":"06",
    "jul":"07",
    "ago":"08",
    "set":"09",
    "out":"10",
    "nov":"11",
    "dez":"12"
}

var traducao_mes2 = {
    "01":"jan",
    "02":"fev",
    "03":"mar",
    "04":"abr",
    "05":"mai",
    "06":"jun",
    "07":"jul",
    "08":"ago",
    "09":"set",
    "10":"out",
    "11":"nov",
    "12":"dez"
}


// Add the x-axis.
svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis);

// Add the y-axis.
svg.append("g")
    .attr("class", "y axis")
    .call(yAxis);

// Add an x-axis label.
svg.append("text")
    .attr("class", "x label")
    .attr("text-anchor", "end")
    .attr("x", width)
    .attr("y", height - 6)
    .text("income per capita, inflation-adjusted (dollars)");

// Add a y-axis label.
svg.append("text")
    .attr("class", "y label")
    .attr("text-anchor", "end")
    .attr("y", 6)
    .attr("dy", ".75em")
    .attr("transform", "rotate(-90)")
    .text("life expectancy (years)");

// Add the year label; the value is set on transition.
var label = svg.append("text")
    .attr("class", "year label")
    .attr("text-anchor", "end")
    .attr("y", height - 24)
    .attr("x", width)
    .text("fev 2015");

// variável que guarda os meses para os quais temos dados
var periodo = []

// Load the data.
d3.json("data/dilma2.json", function(nations) {
    periodo = acha_periodo(nations)
// A bisector since many nation's data is sparsely-defined.
    var bisect = d3.bisector(function(d) { return d[0]; });

// Add a dot per nation. Initialize the data at 0 (primeiro mês), and set the colors.
    var dot = svg.append("g")
        .attr("class", "dots")
        .selectAll(".dot")
        .data(interpolateData(0))
        .enter().append("circle")
        .attr("class", "dot")
        .style("fill", function(d) { return colorScale(color(d)); })
        .call(position)
        .sort(order);

// Add a title.
    dot.append("title")
        .text(function(d) { return d.name; });

// Add an overlay for the year label.
    var box = label.node().getBBox();

    var overlay = svg.append("rect")
        .attr("class", "overlay")
        .attr("x", box.x)
        .attr("y", box.y)
        .attr("width", box.width)
        .attr("height", box.height)
        .on("mouseover", enableInteraction);

// Start a transition that interpolates the data based on year.
    svg.transition()
        .duration(3000)
        .tween("year", tweenYear)
        .each("end", enableInteraction);

// Positions the dots based on data.
    function position(dot) {
        dot .attr("cx", function(d) { return xScale(x(d)); })
            .attr("cy", function(d) { return yScale(y(d)); })
            .attr("r", function(d) { return radiusScale(radius(d)); });
    }

// Defines a sort order so that the smallest dots are drawn on top.
    function order(a, b) {
        return radius(b) - radius(a);
    }

// After the transition finishes, you can mouseover to change the year.
    function enableInteraction() {
        var yearScale = d3.scale.linear()
            .domain([0, periodo.length])
            .range([box.x + 10, box.x + box.width - 10])
            .clamp(true);

// Cancel the current transition, if any.
        svg.transition().duration(100);

        overlay
            .on("mouseover", mouseover)
            .on("mouseout", mouseout)
            .on("mousemove", mousemove)
            .on("touchmove", mousemove);

        function mouseover() {
            label.classed("active", true);
        }

        function mouseout() {
            label.classed("active", false);
        }

        function mousemove() {
            svg.transition().duration(2000)
            displayYear(yearScale.invert(d3.mouse(this)[0]));
        }
    }

// Tweens the entire chart by first tweening the year, and then the data.
// For the interpolated data, the dots and label are redrawn.
    function tweenYear() {
        var year = d3.interpolateNumber(0, periodo.length -1);
        return function(t) { displayYear(year(t));};
    }

// Updates the display to show the specified year.
    function displayYear(year) {
        dot.data(interpolateData(year), key).call(position).sort(order);
        label.text(escreve_data(year));
    }

    function escreve_data(year) {
        if (year == periodo.length) {
            year = year -1
        }

        var temp = periodo[Math.floor(year)];
        var ano = temp.split("-")[0]
        var mes = traducao_mes2[temp.split("-")[1]]
        return mes + " " + ano
    }
// Interpolates the dataset for the given (fractional) year.
    function interpolateData(year) {
        year = periodo[Math.floor(year)]
        var a = nations.map(function(d) {
            return {
                name: d.name,
                governismo: interpolateValues(d.governismo, year),
                variancia: interpolateValues(d.variancia, year),
                num_deputados: interpolateValues(d.num_deputados, year)
            };
        });
        return(a)
    }

// Finds (and possibly interpolates) the value for the specified year.
    function interpolateValues(values, year) {
        var i = bisect.left(values, year, 0, values.length - 1),
            a = values[i];
        return a[1];
    }

    function acha_periodo(dados) {
        var saida = []
        dados[0].governismo.forEach(function (d) {
            saida.push(d[0])
        })
        return saida
    }
});
